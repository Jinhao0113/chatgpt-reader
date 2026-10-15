(async()=>{
  'use strict';
  const R=window.ChatGPTReader,B=window.ChatGPTReaderBridge;
  await B.ready;
  // The reading UI now lives in Chrome's native side panel, never over the page.
  document.getElementById('chatgpt-reader-root')?.remove();
  document.documentElement.classList.remove('cr-reader-open');
  const host=document.createElement('div');host.id='chatgpt-reader-launcher';host.dataset.crOwned='true';document.documentElement.append(host);
  const shadow=host.attachShadow({mode:'open'});
  shadow.innerHTML=`<style>:host{all:initial;font-family:-apple-system,"PingFang SC",sans-serif}:host([hidden]),[hidden]{display:none!important}button{font:inherit;cursor:pointer}.dock{position:fixed;right:16px;bottom:18px;width:42px;height:42px;z-index:2147483640;border:1px solid #ffffff30;border-radius:12px;background:#171717;color:white;box-shadow:0 3px 16px #0002;display:grid;place-items:center}.menu{position:fixed;z-index:2147483646;display:flex;padding:4px;background:#202020;border:1px solid #444;border-radius:9px;box-shadow:0 4px 18px #0003}.menu button{border:0;background:none;color:#fff;padding:8px 11px;border-radius:5px;font-size:12px}.menu button:hover{background:#ffffff20}.toast{position:fixed;bottom:25px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:10px 15px;border-radius:8px;background:#202020;color:#fff;font-size:12px;max-width:420px}button:focus-visible{outline:2px solid #888;outline-offset:3px}</style><button class="dock" aria-label="打开阅读面板" title="打开浏览器原生阅读侧栏"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M15 3v18M6.5 8h5M6.5 12h5M6.5 16h3"/></svg></button><div class="menu" hidden><button class="ask">询问 ChatGPT</button><button class="save">收藏</button></div><div class="toast" role="status" hidden></div>`;
  const $=s=>shadow.querySelector(s);
  let subscribed=false,selected=null,timer,toastTimer,sourceKey=location.pathname,lastSnapshot='',jumpToken=0;
  const rpc=m=>chrome.runtime.sendMessage(m).catch(()=>({ok:false,error:'扩展已更新，请刷新页面'}));
  function toast(text){$('.toast').textContent=text;$('.toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('.toast').hidden=true,4000);}
  function generating(){return Boolean(document.querySelector('[data-testid="stop-button"],[data-testid="composer-stop-button"],button[aria-label="Stop generating"],button[aria-label="Stop streaming"],button[aria-label="停止生成"]'));}
  function snapshot(){
    const nodes=R.messageNodes(),answers=nodes.filter(n=>R.roleOf(n)==='assistant');
    let active=answers.at(-1),best=0;
    for(const n of answers){const r=n.getBoundingClientRect(),visible=Math.max(0,Math.min(r.bottom,innerHeight-80)-Math.max(r.top,80));if(visible>best){best=visible;active=n;}}
    const ids=new Map(nodes.map((n,i)=>[n,R.messageId(n,i)])),r=active?.getBoundingClientRect();
    const outlines=new Map(answers.map(n=>[n,R.outline(n)])),items=outlines.get(active)||[];let headingIndex=items.length?0:-1;for(const item of items)if(item.node.getBoundingClientRect().top<innerHeight*.36)headingIndex=item.index;
    return {url:location.href,title:document.title.replace(/\s*[-|·]\s*ChatGPT\s*$/i,''),dark:document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme==='dark',generating:generating(),visibleId:ids.get(active)||'',progress:r?Math.round(Math.max(0,Math.min(1,(innerHeight-80-r.top)/Math.max(r.height,1)))*100):0,heading:items[headingIndex]?.text || '',headingIndex,entries:nodes.map(n=>({id:ids.get(n),role:R.roleOf(n),html:R.sanitizeHTML(R.messageBody(n).innerHTML),outline:(outlines.get(n)||[]).map(({text,level,index,occurrence})=>({text,level,index,occurrence}))}))};
  }
  async function publish(){if(!subscribed || B.active)return;const data=snapshot(),signature=JSON.stringify(data);if(signature===lastSnapshot)return;lastSnapshot=signature;await rpc({type:'CR_NATIVE_SNAPSHOT',data});}
  function schedule(){if(!subscribed || timer)return;timer=setTimeout(()=>{timer=null;void publish();},220);}
  function range(root,query,compact=false){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('button,script,style,.katex-html')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    const map=[];let text='',n;while((n=walker.nextNode()))for(let i=0;i<n.length;i++){if(compact && /\s/.test(n.data[i]))continue;map.push({n,i});text+=n.data[i];}
    if(compact)query=query.replace(/\s/g,'');const at=text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());if(at<0 || !query)return null;
    const start=map[at],end=map[at+query.length-1];if(!start||!end)return null;const result=document.createRange();result.setStart(start.n,start.i);result.setEnd(end.n,end.i+1);return result;
  }
  function target(id){return R.messageNodes().find((n,i)=>R.messageId(n,i)===id);}
  function jumpAnchor(m){
    const node=target(m.messageId);if(!node)return null;
    const body=R.messageBody(node),items=R.outline(node);
    if(m.outline){
      const ref=m.outline,same=item=>item && item.text===ref.text && item.level===ref.level;
      const indexed=Number.isInteger(ref.index)?items[ref.index]:null;
      return(same(indexed) && indexed.occurrence===ref.occurrence?indexed:items.find(item=>same(item) && item.occurrence===ref.occurrence))?.node || null;
    }
    const item=items.find(x=>x.text===m.text),match=!item && m.text?(range(body,m.text)||range(body,m.text,true)):null;
    return item?.node || match?.startContainer.parentElement || (!m.text?body:null);
  }
  async function jump(m){
    const token=++jumpToken,key=location.pathname;
    if(m.sourceKey!==key)return{ok:false,error:'原对话已切换，目录已更新，请重新选择位置'};
    for(let attempt=0;attempt<3;attempt++){
      if(token!==jumpToken)return{ok:false,cancelled:true};
      if(location.pathname!==key)return{ok:false,error:'原对话已切换，目录已更新，请重新选择位置'};
      const anchor=jumpAnchor(m);if(!anchor){schedule();return{ok:false,error:'目录位置尚未加载或已更新，已刷新目录，请重新选择'};}
      for(let parent=anchor.parentElement;parent;parent=parent.parentElement)if(parent.localName==='details')parent.open=true;
      anchor.style.scrollMarginTop='85px';
      // ChatGPT can replace a heading or change layout while a smooth scroll is
      // running. Navigate immediately, then resolve once more after reflow.
      anchor.scrollIntoView({behavior:'instant',block:'start',inline:'nearest'});
      await new Promise(resolve=>setTimeout(resolve,80));
      if(token!==jumpToken)return{ok:false,cancelled:true};
      if(location.pathname!==key)return{ok:false,error:'原对话已切换，目录已更新，请重新选择位置'};
      const current=jumpAnchor(m),rect=current?.getBoundingClientRect();
      if(current===anchor && rect?.height>0 && rect.top>=60 && rect.top<innerHeight-90){schedule();return{ok:true};}
    }
    return{ok:false,error:'网页仍在调整位置，请稍后再次点击目录'};
  }
  function search(query,index,scroll){
    const ranges=[];if(query)for(const node of R.messageNodes()){
      const walker=document.createTreeWalker(R.messageBody(node),NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('button,script,style,.katex-html')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});let n;
      while((n=walker.nextNode()) && ranges.length<300){let offset=0,at;while(ranges.length<300 && (at=n.data.toLocaleLowerCase().indexOf(query.toLocaleLowerCase(),offset))>=0){const r=document.createRange();r.setStart(n,at);r.setEnd(n,at+query.length);ranges.push(r);offset=at+query.length;}}
    }
    const current=ranges[Math.min(Math.max(0,index),ranges.length-1)];if(window.Highlight && CSS.highlights){CSS.highlights.set('cr-search',new Highlight(...ranges));CSS.highlights.set('cr-current-search',new Highlight(...(current?[current]:[])));}
    if(scroll && current)current.startContainer.parentElement.scrollIntoView({behavior:'smooth',block:'center'});return{ok:true,count:ranges.length};
  }
  async function highlights(){const key=`readerDoc:${location.pathname}`,saved=(await chrome.storage.local.get(key))[key];const nodes=R.assistantNodes(),ranges=[];
    for(const b of saved?.bookmarks || []){const n=nodes.find((n,i)=>R.messageId(n,i)===b.answerId)||nodes[b.index];if(n){const r=range(R.messageBody(n),b.quote)||range(R.messageBody(n),b.quote,true);if(r)ranges.push(r);}}
    if(window.Highlight && CSS.highlights)CSS.highlights.set('cr-saved',new Highlight(...ranges));
  }
  async function settings(){const s=(await chrome.storage.local.get('readerSettings')).readerSettings || {};document.documentElement.classList.toggle('cr-focus',Boolean(s.focus));document.documentElement.style.setProperty('--cr-font-size',`${s.font||16}px`);document.documentElement.style.setProperty('--cr-line-height',String(s.line||1.8));}
  function selection(){if(B.active)return;const s=getSelection();if(!s?.rangeCount||s.isCollapsed){$('.menu').hidden=true;return;}const r=s.getRangeAt(0),start=r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement,end=r.endContainer.nodeType===1?r.endContainer:r.endContainer.parentElement,n=R.closestMessage(start,'assistant');if(!n||R.closestMessage(end,'assistant')!==n){$('.menu').hidden=true;return;}const text=s.toString().trim();if(!text)return;selected={text,node:n};const box=r.getBoundingClientRect();$('.menu').style.left=`${Math.max(8,Math.min(innerWidth-240,box.left))}px`;$('.menu').style.top=`${Math.max(8,Math.min(innerHeight-50,box.bottom+8))}px`;$('.menu').hidden=false;}
  $('.dock').onclick=async()=>{const result=await rpc({type:'CR_OPEN_NATIVE'});if(!result.ok)toast(result.error);};
  $('.menu').onmousedown=e=>e.preventDefault();
  $('.ask').onclick=async()=>{if(!selected)return;if(selected.text.length>12000){toast('选文过长，请缩小选区');return;}const nodes=R.assistantNodes(),result=await rpc({type:'CR_NATIVE_QUOTE',data:{text:selected.text,messageId:R.messageId(selected.node,nodes.indexOf(selected.node))}});$('.menu').hidden=true;if(!result.ok)toast(result.error);};
  $('.save').onclick=async()=>{if(!selected)return;if(selected.text.length>12000){toast('请收藏少于 12,000 字的段落');return;}const {text,node}=selected,index=R.assistantNodes().indexOf(node),answerId=R.messageId(node,index),key=`readerDoc:${location.pathname}`,saved=(await chrome.storage.local.get(key))[key] || {messages:[],bookmarks:[]};saved.bookmarks ||= [];if(!saved.bookmarks.some(b=>b.quote===text&&b.answerId===answerId))saved.bookmarks.push({id:crypto.randomUUID(),quote:text,answerId,index,created:Date.now()});await chrome.storage.local.set({[key]:saved});$('.menu').hidden=true;await highlights();toast('已收藏，可在阅读侧栏查看');};
  chrome.runtime.onMessage.addListener((m,sender,reply)=>{
    if(m.type==='CR_NATIVE_EXPORT'){
      try{
        if(m.sourceKey!==location.pathname)throw new Error('原对话已切换，请刷新目录后重新导出');
        const nodes=m.scope==='all'?R.messageNodes():[target(m.messageId)].filter(Boolean),assets=[],warnings=[];
        if(generating())warnings.push('回答仍在生成，此文件保存的是当前已显示的内容。');
        const entries=nodes.map(n=>R.exportMessage(n,{format:m.format,assets,warnings}));
        const data={entries,assets,warnings};if(JSON.stringify(data).length>5500000)throw new Error('导出内容过大，请选择当前回答或减少已加载的消息');
        reply({ok:true,data});
      }catch(e){reply({ok:false,error:e.message || '无法读取可视化内容，请刷新原网页后重试'});}
    }
    if(m.type==='CR_NATIVE_COLLECT'){subscribed=true;reply({ok:true,data:snapshot()});}
    if(m.type==='CR_NATIVE_SUBSCRIBE'){subscribed=true;lastSnapshot='';void publish();reply({ok:true});}
    if(m.type==='CR_NATIVE_UNSUBSCRIBE'){subscribed=false;reply({ok:true});}
    if(m.type==='CR_NATIVE_JUMP'){jump(m).then(reply,()=>reply({ok:false,error:'无法定位此目录位置，请刷新目录后重试'}));return true;}
    if(m.type==='CR_NATIVE_SEARCH'){reply(search(String(m.query||''),Number(m.index)||0,Boolean(m.scroll)));}
  });
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.readerSettings)void settings();if(changes[`readerDoc:${location.pathname}`]){void highlights();schedule();}});
  new MutationObserver(records=>{if(records.every(r=>host.contains(r.target)))return;schedule();}).observe(document.body,{subtree:true,childList:true,characterData:true});
  document.addEventListener('mouseup',()=>setTimeout(selection,10));document.addEventListener('keyup',selection);document.addEventListener('scroll',()=>{$('.menu').hidden=true;schedule();},true);
  for(const event of ['wheel','touchstart','pointerdown'])document.addEventListener(event,()=>jumpToken++,{capture:true,passive:true});
  document.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key))jumpToken++;},true);
  document.addEventListener('cr-bridge-activated',()=>host.hidden=true);document.addEventListener('cr-bridge-detached',()=>host.hidden=false);
  setInterval(()=>{if(location.pathname!==sourceKey){sourceKey=location.pathname;lastSnapshot='';void highlights();schedule();}else if(subscribed)schedule();},1000);
  host.hidden=B.active;await settings();await highlights();await rpc({type:'CR_AGENT_READY',bridge:B.active});
})();
