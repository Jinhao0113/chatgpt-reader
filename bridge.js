(() => {
  'use strict';
  const R=window.ChatGPTReader;
  const bridge={active:false,job:null};
  window.ChatGPTReaderBridge=bridge;
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  const visible=node=>Boolean(node?.isConnected && node.getClientRects().length && !node.closest('[hidden],[inert],[aria-hidden="true"]') && getComputedStyle(node).visibility!=='hidden');
  const composerRoot=node=>node?.closest('[data-chatgpt-composer],form,[data-testid="composer"],.composer');
  function editor() {
    // The current website uses a ProseMirror textbox with data-composer-markdown,
    // without #prompt-textarea or a Lexical marker. Keep legacy composers too.
    const candidates=[...document.querySelectorAll('textarea,[contenteditable="true"],[contenteditable="plaintext-only"]')];
    return candidates.filter(n=>visible(n) && !n.disabled && !n.readOnly && n.getAttribute('aria-disabled')!=='true').map(node=>{
      const label=[node.getAttribute('aria-label'),node.getAttribute('placeholder')].filter(Boolean).join(' ');
      const known=node.matches('#prompt-textarea,[data-testid="prompt-textarea"],[data-lexical-editor="true"],[data-composer-markdown]');
      const root=composerRoot(node), marked=Boolean(node.closest('[data-chatgpt-composer],[data-testid="composer"],.composer'));
      const named=/询问\s*ChatGPT|向\s*ChatGPT|Ask\s*ChatGPT|Message\s*ChatGPT|Ask anything/i.test(label);
      if(!known && !marked && !named)return {node,score:0};
      if(!marked && node.closest('[role="dialog"],nav,article,[data-message-author-role]'))return {node,score:0};
      return {node,score:(node.hasAttribute('data-composer-markdown')?1000:0)+(marked?800:0)+(known?400:0)+(named?200:0)+(root?50:0)};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score)[0]?.node;
  }
  function buttons(kind,box=editor()) {
    const root=composerRoot(box), scope=root || document;
    const known=kind==='send'?'#composer-submit-button,[data-testid="send-button"],[data-testid="composer-submit-button"]':'[data-testid="stop-button"],[data-testid="composer-stop-button"]';
    const labels=kind==='send'?/^(?:发送|发送提示|发送消息|Send|Send prompt|Send message)$/i:/^(?:停止|停止生成|停止流式传输|Stop|Stop generating|Stop streaming)$/i;
    const nodes=[...scope.querySelectorAll('button')].filter(visible);
    const explicit=nodes.filter(n=>n.matches(known) || labels.test((n.getAttribute('aria-label') || n.getAttribute('title') || '').trim()));
    if(explicit.length)return explicit.find(n=>!n.disabled && n.getAttribute('aria-disabled')!=='true') || explicit[0];
    if(kind==='send' && root?.matches('form')) {
      const submit=nodes.filter(n=>n.getAttribute('type')==='submit' && !/voice|语音|听写/i.test(n.getAttribute('aria-label') || ''));
      if(submit.length===1)return submit[0];
    }
  }
  const sendButton=box=>buttons('send',box);
  const stopButton=()=>buttons('stop');
  function editorText(box) {
    if(box instanceof HTMLTextAreaElement)return box.value;
    const copy=box.cloneNode(true);
    // Only strip explicit empty-paragraph placeholders, never ordinary draft text.
    for(const n of copy.querySelectorAll('[data-empty-paragraph="true"][data-placeholder]')) {
      if(!n.textContent.trim() || n.textContent.trim()===n.dataset.placeholder)n.replaceChildren();
    }
    const textOf=node=>node.nodeType===Node.TEXT_NODE?node.textContent:node.nodeName==='BR'?'\n':[...node.childNodes].map(textOf).join('')+(/^(?:DIV|P|LI|H[1-6])$/.test(node.nodeName)?'\n':'');
    return textOf(copy).replace(/[\u200b\ufeff]/g,'').trim();
  }
  function activate() {
    bridge.active=true;
    document.documentElement.classList.add('cr-bridge');
    document.dispatchEvent(new Event('cr-bridge-activated'));
  }
  async function update(job, status, extra={}) {
    try { await chrome.runtime.sendMessage({type:'CR_BRIDGE_UPDATE',id:job.id,status,...extra}); } catch {}
  }
  function completedHTML(node,fallback) {
    if(!node)return R.sanitizeHTML(fallback || '');
    try {
      const html=R.exportMessage(node,{format:'pdf'}).html;
      if(html.length<1500000)return html;
    }catch{}
    return R.sanitizeHTML(fallback || '')+'<p class="cr-export-notice">此回答的部分图示未能同步，请从后台原对话导出。</p>';
  }
  async function run(job) {
    if (!job || bridge.job?.id===job.id) return;
    activate();
    if (bridge.job) { await update(job,'error',{error:'后台对话正在处理另一个问题'}); return; }
    bridge.job={...job,cancelled:false};
    const current=bridge.job;
    let observer, timer;
    try {
      await update(current,'working');
      const deadline=Date.now()+35000;
      let box;
      while (!(box=editor()) && Date.now()<deadline && !current.cancelled) await pause(350);
      if (current.cancelled) return;
      if (!box) throw new Error('后台网页尚未出现可用的 ChatGPT 输入框。打开后台对话检查页面是否加载完成，再重试。');
      const existing=editorText(box);
      if (existing.trim()) throw new Error('后台标签页有未发送的文字。请先处理草稿，再回到侧栏重试。');
      if (stopButton()) throw new Error('后台 ChatGPT 正在生成回答，请等待结束后重试。');
      current.claimed=true;
      const claim=await chrome.runtime.sendMessage({type:'CR_BRIDGE_CLAIM',id:current.id});
      if (!claim?.ok) throw new Error(claim?.error || '当前任务已失效，请重新提问');
      const baseline=new Set(R.assistantNodes());
      const oldCount=baseline.size;
      const users=R.userNodes().length;
      box.focus();
      if (box instanceof HTMLTextAreaElement) {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(box,current.prompt);
        box.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:current.prompt}));
      } else {
        const selection=window.getSelection(), range=document.createRange();
        range.selectNodeContents(box); selection.removeAllRanges(); selection.addRange(range);
        if (!document.execCommand('insertText',false,current.prompt)) {
          box.textContent=current.prompt;
          box.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:current.prompt}));
        }
      }
      let send;
      const sendDeadline=Date.now()+6000;
      while (!(send=sendButton(editor() || box)) || send.disabled || send.getAttribute('aria-disabled')==='true') {
        if(current.cancelled)return;
        if (Date.now()>sendDeadline) throw new Error('发送按钮不可用。请在后台标签页检查账号状态，或手动发送已填入的问题。');
        await pause(150);
      }
      if (current.cancelled) return;
      // React may replace the textbox while changing from single to multiline.
      // Verify the visible editor still contains our full prompt before clicking.
      const normalize=text=>text.replace(/\s+/g,' ').trim();
      if(normalize(editorText(editor() || box))!==normalize(current.prompt))throw new Error('输入的问题未完整保留。请打开后台对话检查草稿后手动发送。');
      send.click();
      let accepted=false, generated=false, sawStop=false, lastHTML='', lastText='', changedAt=Date.now(), lastEmit=0, settlingAt=0;
      const started=Date.now();
      await new Promise((resolve,reject) => {
        let checking=false;
        async function inspect() {
          if (checking) return; checking=true;
          try {
            if (current.cancelled) { resolve(); return; }
            const stopping=Boolean(stopButton());
            if (stopping) { accepted=true; sawStop=true; settlingAt=0; }
            if (R.userNodes().length>users) accepted=true;
            const all=R.assistantNodes();
            const fresh=all.filter(n=>!baseline.has(n));
            const node=(all.length>oldCount ? all.at(-1) : fresh.at(-1));
            if (node) {
              const body=R.messageBody(node), html=body.innerHTML, text=body.innerText || body.textContent;
              if (text.trim()) {
                generated=true; current.response=node;
                if (html!==lastHTML) { lastHTML=html; lastText=text; changedAt=Date.now(); settlingAt=0; }
                if (Date.now()-lastEmit>450) { lastEmit=Date.now(); await update(current,'streaming',{html:R.sanitizeHTML(lastHTML),text:lastText}); }
              }
            }
            const quiet=Date.now()-changedAt;
            if (generated && !stopping && quiet>1800) {
              // Require an available composer and a settling window; avoids finishing
              // on a transient gap between chunks or a reasoning phase.
              const button=sendButton();
              const complete=Boolean(node?.querySelector('[data-testid="copy-turn-action-button"]') || node?.closest('article')?.querySelector('[data-testid="copy-turn-action-button"]'));
              if (complete || sawStop || (button && !button.disabled)) {
                if (!settlingAt) settlingAt=Date.now();
                if (Date.now()-settlingAt>1500) { await update(current,'done',{html:completedHTML(node,lastHTML),text:lastText}); resolve(); return; }
              }
            }
            if (!accepted && Date.now()-started>14000) throw new Error('网页没有确认发送。请打开后台对话检查；不会自动重复提交问题。');
            if (!generated && !stopping && Date.now()-started>60000) throw new Error('尚未收到回答，请打开后台标签页查看登录、额度或错误提示。');
            if (Date.now()-started>290000) throw new Error('回答等待超时，请打开后台对话查看结果。');
          } catch(e) { reject(e); } finally { checking=false; }
        }
        observer=new MutationObserver(()=>{ void inspect(); });
        observer.observe(document.body,{childList:true,subtree:true,characterData:true});
        timer=setInterval(inspect,650);
        void inspect();
      });
    } catch(e) { if (!current.cancelled) await update(current,'error',{error:e.message,retryable:!current.claimed}); }
    finally { observer?.disconnect(); clearInterval(timer); if (bridge.job?.id===current.id) bridge.job=null; }
  }
  chrome.runtime.onMessage.addListener((m,sender,reply) => {
    if (m.type==='CR_BRIDGE_JOB') { void run(m.job); reply({ok:true}); }
    if (m.type==='CR_BRIDGE_STOP' && bridge.job?.id===m.id) {
      const job=bridge.job; job.cancelled=true;
      stopButton()?.click();
      const body=job.response; const text=body ? R.messageBody(body).innerText : '';
      void update(job,'stopped',{text,html:completedHTML(body,body ? R.messageBody(body).innerHTML : '')}); reply({ok:true});
    }
    if (m.type==='CR_BRIDGE_DETACH') { bridge.active=false; document.documentElement.classList.remove('cr-bridge'); document.dispatchEvent(new Event('cr-bridge-detached')); reply({ok:true}); }
  });
  bridge.ready=chrome.runtime.sendMessage({type:'CR_BRIDGE_HELLO'}).then(state=>{
    if (state?.bridge) { activate(); if (state.job) void run(state.job); }
    return bridge.active;
  }).catch(()=>false);
})();
