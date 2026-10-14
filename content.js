(async () => {
  'use strict';
  if (document.getElementById('chatgpt-reader-root')) return;
  const R=window.ChatGPTReader, N=window.ChatGPTReaderNative, B=window.ChatGPTReaderBridge || {ready:Promise.resolve(),active:false};
  if(!N)return;
  await N.ready;
  await B.ready;
  const sourceURL=()=>N?N.url:location.href;
  const currentKey=()=>new URL(sourceURL()).pathname;
  const host=document.createElement('div');
  host.id='chatgpt-reader-root'; host.dataset.crOwned='true';
  document.documentElement.append(host);
  const shadow=host.attachShadow({mode:'open'});
  const icons={
    reader:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M15 3v18M6.5 8h5M6.5 12h5M6.5 16h3"/>',
    refresh:'<path d="M20 7V3l-3 3a8 8 0 1 0 3 8M20 3h-4"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    arrow:'<path d="M12 19V5m-6 6 6-6 6 6"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    bookmark:'<path d="M6 4h12v17l-6-4-6 4z"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    open:'<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
    stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',
    edit:'<path d="M14 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-9M17 3l4 4-9 9-5 1 1-5z"/>',
    copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V4a1 1 0 0 0-1-1H5a2 2 0 0 0-2 2v10a1 1 0 0 0 1 1h4"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    quote:'<path d="M9 5H4v7h5v-7ZM4 12c0 4 2 6 5 7M20 5h-5v7h5v-7ZM15 12c0 4 2 6 5 7"/>',
    down:'<path d="M12 4v16m-6-6 6 6 6-6"/>',
    chat:'<path d="M21 12a9 9 0 0 1-9 9c-2 0-3.6-.4-5-1l-5 1 1-5a9 9 0 1 1 18-4z"/>'
  };
  const svg=name=>`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.chat}</svg>`;
  shadow.innerHTML=`<style>
    :host { all:initial; font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; color:#171717; font-size:13px; --bg:#fafafa; --surface:#fff; --line:#e5e5e5; --muted:#737373; --ink:#171717; --accent:#171717; --soft:#f0f0f0; }
    :host([hidden]) { display:none!important; }
    * { box-sizing:border-box; } button,input,textarea,select { font:inherit; } button { cursor:pointer; } button:disabled { opacity:.5; cursor:wait; } button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible { outline:2px solid #8c8c8c; outline-offset:3px; }
    [hidden] { display:none!important; } .dark { --bg:#171717; --surface:#202020; --line:#333333; --muted:#a3a3a3; --ink:#ededed; --accent:#ededed; --soft:#262626; color:var(--ink); }
    .panel { position:fixed; right:0; top:0; bottom:0; width:var(--cr-panel-width,360px); z-index:2147483640; background:var(--bg); border-left:1px solid var(--line); box-shadow:none; display:flex; flex-direction:column; color:var(--ink); }
    .brand { display:flex; align-items:center; gap:10px; padding:22px 20px 17px; }
    .logo { width:32px; height:32px; display:grid; place-items:center; background:var(--accent); border-radius:10px; color:var(--bg); font-size:18px; font-weight:600; }
    .logo svg { width:21px; height:21px; } .dock svg { width:25px; height:25px; vertical-align:middle; } .history-count { color:var(--muted); font-size:10px; }
    .brand-title { font-size:15px; font-weight:600; letter-spacing:0; } .eyebrow { font-size:9px; color:var(--muted); letter-spacing:1px; margin-top:3px; }
    .icon { display:grid; place-items:center; width:30px; height:30px; border:0; border-radius:7px; background:transparent; color:var(--muted); } .icon:hover { color:var(--ink); background:var(--soft); } .brand .icon { margin-left:auto; }
    .tabs { display:flex; margin:0 18px; padding-bottom:0; border-bottom:1px solid var(--line); gap:8px; }
    .tab { border:0; color:var(--muted); background:transparent; padding:12px 10px; border-bottom:2px solid transparent; font-size:12px; } .tab[aria-selected="true"] { color:var(--accent); border-bottom-color:var(--accent); font-weight:650; }
    .pane { flex:1; min-height:0; overflow:auto; padding:20px; scrollbar-width:thin; }
    .label { font-size:10px; color:var(--muted); font-weight:650; letter-spacing:1px; margin-bottom:8px; } .row { display:flex; gap:8px; align-items:center; }
    select,input[type="search"],textarea { width:100%; border:1px solid var(--line); border-radius:9px; color:var(--ink); background:var(--surface); padding:10px 11px; outline:none; }
    select { padding:9px; min-width:0; } .hint { color:var(--muted); font-size:11px; line-height:1.7; margin:9px 0; } .empty { padding:30px 5px; color:var(--muted); line-height:1.9; font-size:12px; }
    .stats { display:flex; justify-content:space-between; color:var(--muted); font-size:11px; margin:16px 0 9px; } .bar { height:3px; background:var(--line); border-radius:9px; overflow:hidden; } .bar span { display:block; background:var(--accent); width:0; height:100%; transition:width .1s; }
    .search { margin:21px 0 15px; position:relative; } .search input { padding-left:34px; font-size:12px; } .search>svg { position:absolute; top:11px; left:11px; color:var(--muted); } .search-count { display:flex; align-items:center; justify-content:space-between; color:var(--muted); font-size:11px; padding-top:6px; }
    .section-label { display:flex; align-items:center; justify-content:space-between; margin:21px 0 12px; } .section-label .label { margin:0; } .pill { color:var(--accent); background:var(--soft); padding:4px 7px; border-radius:5px; font-size:10px; }
    .toc { list-style:none; padding:0; margin:0; } .toc li { margin:3px 0; } .toc button { width:100%; text-align:left; padding:10px 10px; border:0; border-left:2px solid transparent; background:transparent; color:var(--muted); border-radius:0 6px 6px 0; line-height:1.6; font-size:12px; } .toc button:hover { background:var(--soft); color:var(--ink); } .toc button.active { color:var(--accent); border-left-color:var(--accent); background:var(--soft); font-weight:550; } .toc .number { font-size:9px; opacity:.6; margin-right:9px; font-variant-numeric:tabular-nums; }
    .footer { padding:15px 20px 17px; border-top:1px solid var(--line); } .footer .row { margin-top:8px; } .button { display:flex; justify-content:center; align-items:center; gap:7px; border:1px solid var(--line); background:var(--surface); color:var(--ink); border-radius:8px; padding:10px 12px; font-size:12px; } .button:hover { background:var(--soft); } .button.primary { background:var(--accent); color:var(--bg); border-color:var(--accent); } .footer button { flex:1; }
    .dock { position:fixed; right:20px; bottom:26px; z-index:2147483640; width:48px; height:48px; border:1px solid #ffffff30; border-radius:15px; color:var(--bg); background:var(--ink); box-shadow:0 4px 20px #00000020; font-size:23px; }
    .selection { position:fixed; z-index:2147483646; display:flex; gap:0; padding:4px; background:var(--ink); border:1px solid var(--line); box-shadow:0 5px 20px #00000020; border-radius:9px; color:var(--bg); } .selection button { display:flex; align-items:center; gap:6px; border:0; color:inherit; background:transparent; padding:7px 10px; border-radius:5px; font-size:12px; } .selection button:hover { background:#ffffff20; }
    .quote { border-left:2px solid var(--accent); padding:10px 12px; margin:0 0 12px; font-size:12px; line-height:1.8; color:var(--muted); background:var(--soft); max-height:170px; overflow:auto; white-space:pre-wrap; border-radius:0 7px 7px 0; } .small-link { border:0; background:transparent; color:var(--accent); font-size:11px; padding:3px 0; }
    .ask-note { padding:11px; background:var(--soft); font-size:11px; line-height:1.8; border-radius:8px; color:var(--muted); } .ask-controls { display:flex; gap:8px; flex-wrap:wrap; margin:14px 0; } .chip { background:var(--surface); color:var(--muted); border:1px solid var(--line); border-radius:20px; padding:6px 10px; font-size:11px; }
    .compose { flex-shrink:0; padding:15px 20px; border-top:1px solid var(--line); background:var(--bg); } .compose textarea { resize:vertical; min-height:75px; max-height:220px; line-height:1.6; font-size:12px; } .compose .row { margin-top:10px; justify-content:space-between; } .compose label { font-size:10px; color:var(--muted); } .compose .button { min-width:82px; }
    .message { padding:16px 0; border-bottom:1px solid var(--line); } .message-role { font-size:10px; color:var(--accent); font-weight:700; letter-spacing:1px; margin-bottom:9px; } .message.user .message-role { color:var(--muted); } .message.user .rich { white-space:pre-wrap; color:var(--muted); font-size:12px; } .rich { font-size:13px; line-height:1.85; overflow-wrap:anywhere; } .rich p { margin:0 0 12px; } .rich h1,.rich h2,.rich h3 { font-size:15px; margin:18px 0 9px; } .rich h4,.rich h5,.rich h6 { font-size:13px; } .rich pre { background:var(--soft); border:1px solid var(--line); padding:12px; border-radius:7px; overflow:auto; white-space:pre-wrap; font-size:11px; } .rich code { font-family:ui-monospace,Menlo,monospace; } .rich a { color:var(--accent); } .rich img { max-width:100%; } .rich blockquote { margin:10px 0; border-left:2px solid var(--line); padding-left:12px; } .rich table { display:block; overflow:auto; width:100%; border-collapse:collapse; font-size:11px; } .rich td,.rich th { border:1px solid var(--line); padding:6px; } .rich math { font-size:1em; } .katex-mathml { position:static!important; width:auto!important; height:auto!important; clip:auto!important; }
    .error-note { color:#bb634c; font-size:12px; line-height:1.8; white-space:pre-wrap; margin-top:10px; } .error-actions { display:flex; gap:14px; flex-wrap:wrap; margin-top:10px; }
    .status { padding:10px 0; color:var(--accent); font-size:11px; line-height:1.8; } .status:empty { display:none; } .status.busy::before { content:'●'; margin-right:6px; animation:pulse 1.3s infinite; } @keyframes pulse { 50% { opacity:.35; } }
    .bookmark { border:1px solid var(--line); border-radius:9px; padding:14px; background:var(--surface); margin-bottom:11px; } .bookmark-text { font-size:12px; line-height:1.85; white-space:pre-wrap; max-height:145px; overflow:auto; } .bookmark-meta { margin:10px 0 8px; color:var(--muted); font-size:10px; } .bookmark .row { justify-content:space-between; } .bookmark button { font-size:10px; }
    .setting { padding:16px 0; border-bottom:1px solid var(--line); } .setting-title { font-weight:550; font-size:12px; margin-bottom:10px; } .setting input[type="range"] { width:100%; accent-color:var(--accent); } .setting .row { justify-content:space-between; } .setting .value { color:var(--accent); font-size:11px; } .setting label { font-size:12px; line-height:1.8; } .setting input[type="checkbox"] { accent-color:var(--accent); }
    .toast { position:fixed; bottom:30px; left:50%; transform:translateX(-50%); max-width:480px; z-index:2147483647; background:var(--ink); color:var(--bg); border-radius:10px; padding:12px 18px; font-size:12px; line-height:1.7; box-shadow:0 5px 20px #00000020; }
    .native .dock {display:none;}
    @media(max-width:1000px) { .brand { padding:12px 20px 9px; } .tabs .tab { padding:9px 10px; } .pane { padding:14px 20px; } .footer { padding:10px 20px; } .footer>select { width:50%; } .footer>.row { float:right; width:47%; margin:0; } .footer>.label { display:block; margin-bottom:5px; } .compose { padding:10px 20px; } .compose textarea { min-height:56px; } } .native .panel {top:0;bottom:0;left:0;width:100%;height:100%;border:0;} .native .footer>select{width:100%;} .native .footer>.row{float:none;width:100%;margin-top:8px;} .native .compose label{flex:1;} @media(prefers-reduced-motion:reduce) { * { transition:none!important; animation:none!important; } }
  </style><link rel="stylesheet" href="${chrome.runtime.getURL('chat.css')}">
  <div class="surface">
    <button class="dock" title="打开阅读面板（⌘ / Ctrl + Shift + L）" aria-label="打开阅读面板">${svg('reader')}</button>
    <aside class="panel" aria-label="ChatGPT 阅读面板" hidden>
      <header class="brand"><span class="logo">${svg('reader')}</span><div><div class="brand-title">阅读助手</div><div class="eyebrow">CHATGPT READER</div></div><button class="icon close" title="收起" aria-label="收起阅读面板">${svg('close')}</button></header>
      <nav class="tabs" role="tablist" aria-label="阅读功能"><button class="tab" id="tab-toc" role="tab" aria-selected="true" aria-controls="pane-toc" data-tab="toc">目录</button><button class="tab" id="tab-ask" role="tab" aria-selected="false" aria-controls="pane-ask" data-tab="ask" tabindex="-1">追问</button><button class="tab" id="tab-saved" role="tab" aria-selected="false" aria-controls="pane-saved" data-tab="saved" tabindex="-1">收藏</button><button class="tab" id="tab-read" role="tab" aria-selected="false" aria-controls="pane-read" data-tab="read" tabindex="-1">阅读</button></nav>
      <div class="ask-header" hidden><span class="chat-title">ChatGPT <span>追问</span></span><div class="row"><button class="icon open-bridge" title="打开后台对话" aria-label="打开后台对话">${svg('open')}</button><button class="icon ask-export" title="导出侧边对话 PDF" aria-label="导出侧边对话 PDF">${svg('download')}</button><button class="icon reset-ask" title="开始新的侧边对话" aria-label="开始新的侧边对话">${svg('edit')}</button></div></div>
      <section class="pane" id="pane-toc" role="tabpanel" aria-labelledby="tab-toc">
        <div class="row" style="justify-content:space-between;margin-bottom:8px"><div class="label" style="margin:0">正在阅读</div><div class="row"><span class="history-count">0 条回答</span><button class="icon rescan" title="重新扫描当前对话" aria-label="重新扫描当前对话">${svg('refresh')}</button></div></div><select class="answer-select" aria-label="选择回答"><option>等待 ChatGPT 回答</option></select>
        <div class="stats"><span class="reading-time">—</span><span class="progress-text">已读 0%</span></div><div class="bar"><span></span></div>
        <div class="search">${svg('search')}<input type="search" class="search-input" placeholder="搜索整个对话…" aria-label="搜索对话"><div class="search-count" hidden><span class="search-result"></span><div class="row"><button class="icon search-prev" aria-label="上一个搜索结果">↑</button><button class="icon search-next" aria-label="下一个搜索结果">↓</button></div></div></div>
        <div class="section-label"><span class="label">回答目录</span><span class="pill generation">实时更新</span></div>
        <ol class="toc"></ol><div class="empty toc-empty">打开任意历史聊天或新对话即可查看目录。<br>消息加载后会自动更新，无标题时按段落导航。</div>
      </section>
      <section class="pane" id="pane-ask" role="tabpanel" aria-labelledby="tab-ask" hidden>
        <div class="ask-empty"><div class="empty-heading">有什么想进一步了解的？</div><p>选中原文片段，或直接在这里提问。</p><div class="empty-suggestions"><button class="chip" data-prompt="请用更简单的话解释这段内容。">解释一下</button><button class="chip" data-prompt="请给一个具体例子来说明这段内容。">举个例子</button><button class="chip" data-prompt="请提炼这段内容的要点。">提炼要点</button></div></div>
        <div class="messages"></div><div class="status" role="status" aria-live="polite"></div>
      </section>
      <section class="pane" id="pane-saved" role="tabpanel" aria-labelledby="tab-saved" hidden><div class="label">当前对话的收藏</div><div class="hint">选中文字后点击「收藏」，可随时回到原段落。收藏保存在此浏览器。</div><div class="saved-list"></div><button class="button export-saved" style="width:100%;margin-top:12px">${svg('download')} 导出收藏笔记</button></section>
      <section class="pane" id="pane-read" role="tabpanel" aria-labelledby="tab-read" hidden>
        <div class="label">阅读偏好</div>
        <div class="setting"><label class="row"><span>启用阅读排版</span><input class="focus-toggle" type="checkbox"></label><div class="hint">调整回答文字、行距，并让长代码自动换行。</div></div>
        <div class="setting"><div class="row setting-title"><span>字号</span><span class="value font-value">16 px</span></div><input class="font-range" aria-label="字号" type="range" min="14" max="22" value="16" step="1"></div>
        <div class="setting"><div class="row setting-title"><span>行距</span><span class="value line-value">1.8</span></div><input class="line-range" aria-label="行距" type="range" min="1.4" max="2.4" value="1.8" step="0.1"></div>
        <div class="setting"><div class="setting-title">面板主题</div><select class="theme-select" aria-label="面板主题"><option value="auto">跟随 ChatGPT</option><option value="light">明亮</option><option value="dark">深色</option></select></div>
        <div class="setting"><label class="row"><span>自动跟随当前可见回答</span><input type="checkbox" class="follow-toggle" checked></label><div class="hint">滚动对话时，目录自动切换到正在阅读的回答。</div></div>
        <div class="setting"><button class="button restore-settings" style="width:100%">恢复默认阅读设置</button></div>
      </section>
      <button class="icon jump-latest" aria-label="回到最新回答" title="回到最新回答" hidden>${svg('down')}</button>
      <form class="compose" hidden><div class="composer-box"><div class="selection-context" hidden><div class="quote-heading"><span>${svg('quote')} 引用原文</span><button type="button" class="icon clear-quote" title="清除引用" aria-label="清除引用">${svg('close')}</button></div><blockquote class="quote"></blockquote><div class="ask-controls"><button type="button" class="chip" data-prompt="请用更简单的话解释这段内容。">解释一下</button><button type="button" class="chip" data-prompt="请给一个具体例子来说明这段内容。">举个例子</button><button type="button" class="chip" data-prompt="请提炼这段内容的要点。">提炼要点</button></div></div><textarea rows="1" class="ask-input" aria-label="侧边追问" placeholder="询问 ChatGPT" aria-describedby="compose-hint"></textarea><div class="composer-actions"><label class="context-option" title="附带正在阅读的回答前 6,000 字"><input type="checkbox" class="include-context">${svg('reader')}<span>附带原回答</span></label><button type="submit" class="icon ask-send" title="发送（Enter）" aria-label="发送" disabled>${svg('arrow')}</button><button type="button" class="icon ask-stop" title="停止生成" aria-label="停止" hidden>${svg('stop')}</button></div></div><div class="compose-hint" id="compose-hint">Enter 发送 · Shift + Enter 换行</div></form>
      <footer class="footer"><label class="label" for="export-scope">导出范围</label><select id="export-scope" class="export-scope" aria-label="导出范围"><option value="current">当前回答</option><option value="all">整个对话（当前已加载）</option><option value="side">侧边对话</option></select><div class="row"><button class="button export-pdf">${svg('download')} 导出 PDF</button><button class="button export-md">Markdown</button></div></footer>
    </aside>
    <div class="selection" hidden><button class="selection-ask">${svg('chat')} 询问 ChatGPT</button><button class="selection-save">${svg('bookmark')} 收藏</button></div>
    <div class="toast" role="status" hidden></div>
  </div>`;
  const $=s=>shadow.querySelector(s), $$=s=>[...shadow.querySelectorAll(s)];
  const defaults={font:16,line:1.8,focus:false,theme:'auto',follow:true};
  const state={open:false,tab:'toc',sourceKey:currentKey(),answers:[],active:null,items:[],bookmarks:[],messages:[],quote:'',quoteNode:null,selected:null,busy:false,currentJob:null,settings:{...defaults},search:[],searchIndex:0};
  let refreshTimer, saveTimer, toastTimer, scrollFrame, signature='', optionSignature='', lastDocLoad=0;
  async function rpc(message) { try { return N?await N.rpc({sourceKey:state.sourceKey,...message}):await chrome.runtime.sendMessage({sourceKey:state.sourceKey,...message}); } catch { return {ok:false,error:'扩展已更新，请刷新 ChatGPT 页面'}; } }
  function toast(text) { $('.toast').textContent=text; $('.toast').hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('.toast').hidden=true,4200); }
  async function saveDoc() {
    const key=`readerDoc:${state.sourceKey}`;
    const value={bookmarks:state.bookmarks,messages:state.messages.slice(-80)};
    try { await chrome.storage.local.set({[key]:value}); } catch { toast('本地存储已满，请导出收藏笔记后清理'); }
  }
  const scheduleSave=()=>{ clearTimeout(saveTimer); saveTimer=setTimeout(saveDoc,600); };
  async function loadDoc() {
    const token=++lastDocLoad, key=`readerDoc:${state.sourceKey}`;
    const saved=await chrome.storage.local.get(key);
    if (token!==lastDocLoad) return;
    state.bookmarks=saved[key]?.bookmarks || []; state.messages=saved[key]?.messages || [];
    for(const message of state.messages) {
      if(message.error===true && !message.errorText && !message.html && message.text) {
        const split=message.text.lastIndexOf('\n\n');
        message.errorText=message.text.slice(split<0?0:split+2);message.text=split<0?'':message.text.slice(0,split);
        message.retryable=/^没有找到 ChatGPT 输入框/.test(message.errorText);
      }
    }
    renderSaved(); renderMessages(); highlightBookmarks();
    const remote=await rpc({type:'CR_STATE'});
    if (token!==lastDocLoad) return;
    state.busy=Boolean(remote.busy); state.currentJob=remote.last?.id || null;
    if (remote.last) applyUpdate(remote.last); else setBusy(false);
  }
  function setOpen(open) {
    if(!open){void awaitClose();return;}
    state.open=true;$('.panel').hidden=false;$('.dock').hidden=true;
  }
  async function awaitClose(){const result=await N.close();if(!result.ok)toast(result.error);}
  function switchTab(tab) {
    state.tab=tab;
    for (const button of $$('.tab')) { const selected=button.dataset.tab===tab; button.setAttribute('aria-selected',String(selected)); button.tabIndex=selected?0:-1; }
    for (const pane of $$('.pane')) pane.hidden=pane.id!==`pane-${tab}`;
    $('.compose').hidden=tab!=='ask'; $('.footer').hidden=tab==='ask';
    $('.ask-header').hidden=tab!=='ask';$('.surface').classList.toggle('chat-mode',tab==='ask');fitComposer();
  }
  function applySettings() {
    const s=state.settings, html=document.documentElement;
    html.classList.toggle('cr-focus',Boolean(s.focus));
    html.style.setProperty('--cr-font-size',`${s.font}px`); html.style.setProperty('--cr-line-height',String(s.line));
    const dark=s.theme==='dark' || (s.theme==='auto' && (N?N.dark:(html.classList.contains('dark') || html.dataset.theme==='dark' || (!html.classList.contains('light') && matchMedia('(prefers-color-scheme:dark)').matches))));
    $('.surface').classList.toggle('dark',dark);
    $('.font-range').value=s.font; $('.font-value').textContent=`${s.font} px`; $('.line-range').value=s.line; $('.line-value').textContent=Number(s.line).toFixed(1); $('.theme-select').value=s.theme; $('.focus-toggle').checked=s.focus; $('.follow-toggle').checked=s.follow;
  }
  async function changeSetting(key,value) { state.settings[key]=value; applySettings(); await chrome.storage.local.set({readerSettings:state.settings}); }
  function visibleAnswer() {
    if(N)return state.answers.find(n=>R.messageId(n,state.answers.indexOf(n))===N.visibleId) || state.answers.at(-1) || null;
    let best=null, score=0;
    for (const answer of state.answers) {
      const r=answer.getBoundingClientRect(); const visible=Math.max(0,Math.min(r.bottom,innerHeight-100)-Math.max(r.top,90));
      if (visible>score) { score=visible; best=answer; }
    }
    return best || state.answers.at(-1) || null;
  }
  function refresh() {
    if(currentKey()!==state.sourceKey){void syncConversation();return;}
    state.answers=R.assistantNodes();
    $('.history-count').textContent=`${state.answers.length} 条回答`;
    const old=state.active;
    if (!state.answers.includes(state.active) || state.settings.follow) state.active=visibleAnswer();
    const options=state.answers.map((a,i)=>`${R.messageId(a,i)}:${R.messageBody(a).textContent.trim().slice(0,32)}`).join('|');
    if (options!==optionSignature) {
      optionSignature=options; $('.answer-select').replaceChildren();
      if (!state.answers.length) $('.answer-select').append(new Option('等待 ChatGPT 回答',''));
      state.answers.forEach((a,i)=>$('.answer-select').append(new Option(`回答 ${i+1} · ${R.messageBody(a).textContent.trim().replace(/\s+/g,' ').slice(0,25) || '正在生成…'}`,String(i))));
    }
    if (state.active) $('.answer-select').value=String(state.answers.indexOf(state.active));
    const items=state.active ? R.outline(state.active) : [];
    const sig=items.map(x=>`${x.level}:${x.text}`).join('|');
    if (sig!==signature || old!==state.active) {
      signature=sig; state.items=items; renderOutline();
    }
    const text=state.active ? R.messageBody(state.active).textContent : '';
    $('.reading-time').textContent=text ? `约 ${Math.max(1,Math.ceil(text.length/550))} 分钟 · ${text.trim().length.toLocaleString()} 字` : '—';
    const streaming=N?N.generating:Boolean(document.querySelector('[data-testid="stop-button"], button[aria-label="Stop generating"], button[aria-label="停止生成"]'));
    $('.generation').textContent=streaming?'生成中…':'实时更新';
    updateProgress(); highlightBookmarks();
  }
  async function syncConversation() {
    const next=currentKey();if(next===state.sourceKey)return;
    clearTimeout(saveTimer);const saving=saveDoc();++lastDocLoad;
    state.sourceKey=next;state.active=null;state.currentJob=null;state.messages=[];state.bookmarks=[];
    clearQuote();setBusy(false);$('.status').textContent='';$('.search-input').value='';search();signature='';optionSignature='';
    renderMessages();renderSaved();refresh();
    await saving;
    if(state.sourceKey===next)await loadDoc();
  }
  function renderOutline() {
    $('.toc').replaceChildren(); $('.toc-empty').hidden=state.items.length>0;
    const min=state.items.length?Math.min(...state.items.map(x=>x.level)):1;
    state.items.forEach((item,i)=>{
      const li=document.createElement('li'), button=document.createElement('button'), num=document.createElement('span'), title=document.createElement('span');
      num.className='number'; num.textContent=String(i+1).padStart(2,'0'); title.textContent=item.text;
      button.style.paddingLeft=`${10+(item.level-min)*13}px`; button.title=item.text; button.append(num,title); button.addEventListener('click',()=>jump(item.node)); li.append(button); $('.toc').append(li);
    });
  }
  function jump(node) {
    if(N){const message=node.closest('[data-native-id]');void N.jump(message?.dataset.nativeId,node.textContent.trim().slice(0,12000));return;}
    // scroll-margin is an inline change limited to the chosen anchor.
    node.style.scrollMarginTop='100px';
    node.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
  }
  function updateProgress() {
    if (!state.active) { $('.progress-text').textContent='已读 0%'; $('.bar span').style.width='0%'; return; }
    const r=state.active.getBoundingClientRect();
    const percent=N?N.progress:Math.round(Math.max(0,Math.min(1,(innerHeight-110-r.top)/Math.max(r.height,1)))*100);
    $('.progress-text').textContent=`已读 ${percent}%`; $('.bar span').style.width=`${percent}%`;
    let current=0;
    state.items.forEach((x,i)=>{ if(N?x.text===N.heading:x.node.getBoundingClientRect().top<innerHeight*.36)current=i; });
    $$('.toc button').forEach((b,i)=>{ b.classList.toggle('active',i===current); if(i===current)b.setAttribute('aria-current','location'); else b.removeAttribute('aria-current'); });
  }
  function findRange(root,query,offset=0,compact=false) {
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('script,style,button,.katex-html,[data-cr-owned]')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    const nodes=[]; let text='',n;
    while ((n=walker.nextNode())) {
      const positions=[];let part='';
      for(let i=0;i<n.textContent.length;i++) { if(compact && /\s/.test(n.textContent[i]))continue;positions.push(i);part+=n.textContent[i]; }
      if(part) { nodes.push({n,start:text.length,positions});text+=part; }
    }
    if(compact)query=query.replace(/\s/g,'');
    const index=text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase(),offset);
    if(index<0)return null;
    const end=index+query.length, a=nodes.find(x=>x.start+x.positions.length>index), b=nodes.find(x=>x.start+x.positions.length>=end);
    if(!a||!b)return null;
    const range=document.createRange(); range.setStart(a.n,a.positions[index-a.start]); range.setEnd(b.n,b.positions[end-b.start-1]+1); return {range,next:end};
  }
  function search() {
    const query=$('.search-input').value.trim(); state.search=[]; state.searchIndex=0;
    if (query) {
      const nodes=R.messageNodes();
      for(const node of nodes) { let offset=0,found; while(state.search.length<300 && (found=findRange(R.messageBody(node),query,offset))) { state.search.push(found.range); offset=found.next; } }
    }
    $('.search-count').hidden=!query; showSearch(false);
  }
  function showSearch(scroll=true) {
    const count=state.search.length, current=state.search[state.searchIndex];
    $('.search-result').textContent=count ? `${state.searchIndex+1} / ${count}${count===300?'（最多 300 处）':''}` : '没有匹配内容';
    if (window.Highlight && CSS.highlights) { CSS.highlights.set('cr-search',new Highlight(...state.search)); CSS.highlights.set('cr-current-search',new Highlight(...(current?[current]:[]))); }
    if(N)void N.search($('.search-input').value.trim(),state.searchIndex,scroll);
    else if(scroll && current) jump(current.startContainer.parentElement);
  }
  function onSelection() {
    if (B.active) return;
    const selection=window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed || shadow.contains(selection.anchorNode)) { $('.selection').hidden=true; return; }
    const range=selection.getRangeAt(0), start=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement, end=range.endContainer.nodeType===1?range.endContainer:range.endContainer.parentElement;
    const node=R.closestMessage(start,'assistant');
    if(!node || R.closestMessage(end,'assistant')!==node) { $('.selection').hidden=true; return; }
    const text=selection.toString().trim(); if (!text) return;
    state.selected={text,node,range:range.cloneRange()};
    const rect=range.getBoundingClientRect(); const toolbar=$('.selection');
    toolbar.hidden=false; toolbar.style.left=`${Math.max(8,Math.min(innerWidth-285,rect.left))}px`; toolbar.style.top=`${Math.max(8,Math.min(innerHeight-55,rect.bottom+8))}px`;
  }
  function quoteSelection() {
    if (!state.selected) return;
    if (state.selected.text.length>12000) { toast('选文超过 12,000 字，请缩小选区'); return; }
    state.quote=state.selected.text; state.quoteNode=state.selected.node;
    $('.quote').textContent=state.quote; $('.selection-context').hidden=false; $('.selection').hidden=true; setOpen(true); switchTab('ask');fitComposer(); $('.ask-input').focus();
  }
  function consumeNativeQuote(){if(!N.pendingQuote)return;const quote=N.pendingQuote;N.pendingQuote=null;if(quote.sourceKey!==currentKey())return;state.selected={text:quote.text,node:state.answers.find((n,i)=>R.messageId(n,i)===quote.messageId)};quoteSelection();}
  function clearQuote() { state.quote=''; state.quoteNode=null; $('.quote').textContent=''; $('.selection-context').hidden=true;fitComposer(); }
  function saveSelection() {
    if(!state.selected)return;
    const {text,node}=state.selected; if(text.length>12000){toast('请收藏少于 12,000 字的段落');return;}
    const index=state.answers.indexOf(node), answerId=R.messageId(node,index);
    if(state.bookmarks.some(b=>b.quote===text && b.answerId===answerId)){toast('这段内容已经收藏');return;}
    state.bookmarks.push({id:crypto.randomUUID(),quote:text,answerId,index,created:Date.now()}); scheduleSave(); renderSaved(); highlightBookmarks(); $('.selection').hidden=true; toast('已收藏，可在「收藏」中回到原文');
  }
  function bookmarkRange(b) {
    const node=state.answers.find((a,i)=>R.messageId(a,i)===b.answerId) || state.answers[b.index]; return node ? (findRange(R.messageBody(node),b.quote)?.range || findRange(R.messageBody(node),b.quote,0,true)?.range) : null;
  }
  function highlightBookmarks() {
    if(!window.Highlight || !CSS.highlights)return;
    CSS.highlights.set('cr-saved',new Highlight(...state.bookmarks.map(bookmarkRange).filter(Boolean)));
  }
  function renderSaved() {
    const list=$('.saved-list'); list.replaceChildren();
    if(!state.bookmarks.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='把值得再读的段落，留在这里。';list.append(empty);}
    for(const b of state.bookmarks) {
      const card=document.createElement('article');card.className='bookmark';
      const quote=document.createElement('div');quote.className='bookmark-text';quote.textContent=b.quote;
      const meta=document.createElement('div');meta.className='bookmark-meta';meta.textContent=`回答 ${b.index+1} · ${new Date(b.created).toLocaleDateString()}`;
      const row=document.createElement('div');row.className='row';
      const locate=document.createElement('button');locate.className='small-link';locate.textContent='回到原文 ↗';locate.onclick=()=>{const range=bookmarkRange(b);if(range)jump(range.startContainer.parentElement);else toast('原文尚未加载，或回答已编辑，请先向上滚动加载');};
      const ask=document.createElement('button');ask.className='small-link';ask.textContent='询问';ask.onclick=()=>{state.selected={text:b.quote,node:state.answers[b.index]};quoteSelection();};
      const remove=document.createElement('button');remove.className='small-link';remove.textContent='移除';remove.onclick=()=>{state.bookmarks=state.bookmarks.filter(x=>x.id!==b.id);scheduleSave();renderSaved();highlightBookmarks();};
      row.append(locate,ask,remove);card.append(quote,meta,row);list.append(card);
    }
  }
  function fitComposer() {
    const input=$('.ask-input');
    if(state.tab==='ask') { input.style.height='auto';input.style.height=`${Math.max(42,Math.min(parseFloat(getComputedStyle(input).maxHeight) || 168,input.scrollHeight))}px`; }
    $('.ask-send').disabled=state.busy || (!input.value.trim() && !state.quote);
    updateJump();
  }
  function updateJump() { const pane=$('#pane-ask');$('.jump-latest').hidden=state.tab!=='ask' || !state.messages.length || pane.scrollHeight-pane.scrollTop-pane.clientHeight<90; }
  function setBusy(busy) { state.busy=busy; $('.ask-send').hidden=busy; $('.ask-stop').hidden=!busy; $('.reset-ask').disabled=busy; $('.status').classList.toggle('busy',busy);fitComposer(); }
  function renderMessages() {
    const list=$('.messages');list.replaceChildren();
    for(const message of state.messages) {
      const waiting=message.role==='assistant' && state.busy && message.id===state.currentJob && !message.text && !message.html;
      const article=document.createElement('article');article.className=`message ${message.role}${message.error?' error':''}${waiting?' waiting':''}`; article.dataset.id=message.id;article.setAttribute('aria-label',message.role==='user'?'你的提问':'ChatGPT 回答');
      const role=document.createElement('div');role.className='message-role';role.textContent=message.role==='user'?'你':'CHATGPT';
      const body=document.createElement('div');body.className='rich';
      if(message.role==='assistant' && message.html) body.innerHTML=R.sanitizeHTML(message.html); else body.textContent=(message.role==='user'?message.question:undefined) ?? (message.text || (waiting?'正在思考…':''));
      if(message.role==='user' && message.quote) {
        const quote=document.createElement('details');quote.className='message-quote';
        const summary=document.createElement('summary');summary.textContent='引用的原文';
        const text=document.createElement('blockquote');text.textContent=message.quote;quote.append(summary,text);article.append(quote);
      }
      article.append(role,body);
      if(message.role==='assistant' && (message.text || message.html) && !(state.busy && message.id===state.currentJob)) {
        const actions=document.createElement('div');actions.className='message-actions';
        const copy=document.createElement('button');copy.className='icon reply-copy';copy.title='复制回答';copy.setAttribute('aria-label','复制回答');copy.innerHTML=svg('copy');
        copy.onclick=async()=>{try{await navigator.clipboard.writeText(message.text || body.innerText);copy.innerHTML=svg('check');copy.title='已复制';copy.setAttribute('aria-label','已复制');setTimeout(()=>{if(copy.isConnected){copy.innerHTML=svg('copy');copy.title='复制回答';copy.setAttribute('aria-label','复制回答');}},1800);}catch{toast('复制失败，请选中回答文字复制');}};
        actions.append(copy);article.append(actions);
      }
      if(message.error) {
        role.textContent=message.html || message.text?'CHATGPT · 回答中断':'发送未完成';
        const note=document.createElement('div');note.className='error-note';note.setAttribute('role','alert');note.textContent=message.errorText || (typeof message.error==='string'?message.error:'侧边提问未完成，请打开后台对话检查。');
        const actions=document.createElement('div');actions.className='error-actions';
        const open=document.createElement('button');open.className='small-link';open.textContent='打开后台对话 ↗';open.onclick=openBridge;actions.append(open);
        if(message===state.messages.at(-1) && message.retryable) {
          const retry=document.createElement('button');retry.className='small-link retry-ask';retry.textContent='重试此问题';retry.disabled=state.busy;retry.onclick=()=>retryAsk(message);actions.append(retry);
        }
        article.append(note,actions);
      }
      list.append(article);
    }
    const empty=state.messages.length===0;$('.ask-empty').hidden=!empty;$('#pane-ask').classList.toggle('ask-blank',empty);updateJump();
  }
  function applyUpdate(m) {
    if(state.currentJob && m.id!==state.currentJob)return;
    const message=state.messages.find(x=>x.id===m.id && x.role==='assistant');
    if (message) {
      message.html=m.html || message.html || '';message.text=m.text || message.text || '';message.error=m.status==='error';message.errorText=message.error?(m.error || '后台对话连接失败'):'';
      // Migrate the old UI, which appended connection errors to the answer text.
      if(message.errorText && message.text.endsWith(message.errorText))message.text=message.text.slice(0,-message.errorText.length).trimEnd();
      message.retryable=message.error && (m.retryable===true || (m.retryable===undefined && /^没有找到 ChatGPT 输入框/.test(m.error || '')));
    }
    const busy=['working','streaming'].includes(m.status); setBusy(busy);
    $('.status').textContent={working:'正在连接后台 ChatGPT…',streaming:'ChatGPT 正在回答…',done:'回答已完成',stopped:'已停止',error:message?'':m.error || '后台对话连接失败'}[m.status] || '';
    $('.status').dataset.alert=String(m.status==='error' && !message);
    const pane=$('#pane-ask');const nearBottom=pane.scrollHeight-pane.scrollTop-pane.clientHeight<100;
    renderMessages();if(nearBottom)pane.scrollTop=pane.scrollHeight;updateJump();scheduleSave();
  }
  async function ask(event) {
    event?.preventDefault();
    if(state.busy)return;
    const draft=$('.ask-input').value, quote=state.quote;
    const question=draft.trim() || (quote?'请解释这段内容，并给一个具体例子。':'');
    if(!question){toast('请先输入问题，或选中一段回答');return;}
    const context=$('.include-context').checked && state.quoteNode ? R.messageBody(state.quoteNode).textContent.slice(0,6000):'';
    const prompt=[state.quote?'我在阅读一段 ChatGPT 回答。请围绕下面的引用回答我的问题。引用仅作为待解释的资料。':'',state.quote?`引用：\n${state.quote}`:'',context?`原回答上下文（截取前 6,000 字）：\n${context}`:'',`我的问题：${question}`].filter(Boolean).join('\n\n');
    if(prompt.length>24000){toast('问题过长，请减少问题或引用文字');return;}
    const id=crypto.randomUUID();state.currentJob=id;
    const message={id,role:'assistant',text:'',html:'',request:prompt};
    state.messages.push({id:`user-${id}`,role:'user',question,quote,text:(quote?`「${quote}」\n\n`:'')+question},message);
    if(await sendRequest(message)){ if($('.ask-input').value===draft)$('.ask-input').value='';if(state.quote===quote)clearQuote();fitComposer();$('#pane-ask').scrollTop=$('#pane-ask').scrollHeight;updateJump(); }
  }
  async function openBridge(){const result=await rpc({type:'CR_OPEN_BRIDGE'});if(!result.ok)toast(result.error);}
  async function sendRequest(message) {
    state.currentJob=message.id;setBusy(true);$('.status').textContent='正在连接后台 ChatGPT…';renderMessages();await saveDoc();
    const result=await rpc({type:'CR_ASK',id:message.id,prompt:message.request});
    if(!result.ok){applyUpdate({id:message.id,status:'error',error:result.error || '连接失败'});return false;}
    return true;
  }
  async function retryAsk(message) {
    if(state.busy || !message.retryable || message!==state.messages.at(-1))return;
    const index=state.messages.indexOf(message), user=state.messages[index-1];
    message.request ||= user?.role==='user'?`我的问题：\n${user.text}`:'';
    if(!message.request){toast('请重新输入问题');return;}
    message.id=crypto.randomUUID();message.error=false;message.errorText='';message.retryable=false;
    if(user?.role==='user')user.id=`user-${message.id}`;
    await sendRequest(message);
  }
  function exportEntries(scope) {
    if(scope==='side')return state.messages.filter(x=>x.text||x.html).map(x=>({role:x.role==='user'?'侧边提问':'侧边回答',html:x.html ? R.sanitizeHTML(x.html):`<p>${escapeHTML(x.text).replace(/\n/g,'<br>')}</p>`,text:x.text || ''}));
    const nodes=scope==='all' ? R.messageNodes() : (state.active?[state.active]:[]);
    return nodes.map(n=>({role:R.roleOf(n)==='user'?'你':'ChatGPT',html:R.sanitizeHTML(R.messageBody(n).innerHTML),text:R.markdown(n)}));
  }
  function escapeHTML(text) { const n=document.createElement('span');n.textContent=text;return n.innerHTML; }
  function download(text,name,type='text/markdown;charset=utf-8') { const url=URL.createObjectURL(new Blob([text],{type})), a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000); }
  const title=()=>(N?N.title:document.title).replace(/\s*[-|·]\s*ChatGPT\s*$/i,'').slice(0,100) || 'ChatGPT 对话';
  const filename=()=>title().replace(/[\\/:*?"<>|]/g,'-');
  async function exportPDF(scope) {
    const entries=exportEntries(typeof scope==='string'?scope:$('.export-scope').value);
    if(!entries.length){toast('还没有可导出的回答');return;}
    const result=await rpc({type:'CR_PRINT',data:{title:title(),source:sourceURL(),created:new Date().toISOString(),entries}});
    if(!result.ok)toast(result.error || '无法打开 PDF 预览');
  }
  function exportMarkdown() {
    const entries=exportEntries($('.export-scope').value);
    if(!entries.length){toast('还没有可导出的回答');return;}
    download(`# ${title()}\n\n来源：${sourceURL()}\n\n${entries.map(e=>`## ${e.role}\n\n${e.text}`).join('\n\n---\n\n')}\n`,`${filename()}.md`);
  }
  $('.dock').onclick=()=>setOpen(true);$('.close').onclick=()=>{setOpen(false);$('.dock').focus();};
  $$('.tab').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
  $('.tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=$$('.tab'),i=tabs.findIndex(t=>t.dataset.tab===state.tab),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;switchTab(tabs[next].dataset.tab);tabs[next].focus();});
  $('.answer-select').onchange=e=>{state.active=state.answers[Number(e.target.value)];void changeSetting('follow',false);signature='';refresh();};
  $('.rescan').onclick=async()=>{if(N)await N.rescan();refresh();if(!state.answers.length)toast('暂未识别到回答，请等待历史消息加载后重试');};
  $('.search-input').oninput=search;$('.search-prev').onclick=()=>{if(state.search.length){state.searchIndex=(state.searchIndex-1+state.search.length)%state.search.length;showSearch();}};$('.search-next').onclick=()=>{if(state.search.length){state.searchIndex=(state.searchIndex+1)%state.search.length;showSearch();}};
  $('.search-input').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();(e.shiftKey?$('.search-prev'):$('.search-next')).click();}};
  $('.selection').onmousedown=e=>e.preventDefault();$('.selection-ask').onclick=quoteSelection;$('.selection-save').onclick=saveSelection;$('.clear-quote').onclick=clearQuote;
  $$('.chip').forEach(b=>b.onclick=()=>{$('.ask-input').value=b.dataset.prompt;fitComposer();$('.ask-input').focus();});
  $('.compose').onsubmit=ask;$('.ask-input').oninput=fitComposer;
  $('.ask-input').onkeydown=e=>{if(e.key==='Enter' && !e.shiftKey && !e.altKey && !e.isComposing && e.keyCode!==229){e.preventDefault();void ask();}};
  $('#pane-ask').onscroll=updateJump;
  $('.jump-latest').onclick=()=>$('#pane-ask').scrollTo({top:$('#pane-ask').scrollHeight,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
  new ResizeObserver(entries=>{const height=entries[0].borderBoxSize?.[0]?.blockSize || entries[0].contentRect.height;if(height>0)$('.panel').style.setProperty('--compose-height',`${height}px`);updateJump();}).observe($('.compose'));
  window.addEventListener('resize',fitComposer);
  $('.ask-stop').onclick=async()=>{const result=await rpc({type:'CR_STOP'});if(!result.ok)toast(result.error);};
  $('.open-bridge').onclick=openBridge;
  $('.reset-ask').onclick=async()=>{if(state.busy)return;const result=await rpc({type:'CR_RESET'});if(!result.ok){toast(result.error);return;}state.messages=[];state.currentJob=null;$('.ask-input').value='';clearQuote();renderMessages();$('.status').textContent='已开始新对话';$('.ask-input').focus();void saveDoc();};
  $('.focus-toggle').onchange=e=>void changeSetting('focus',e.target.checked);$('.font-range').oninput=e=>{state.settings.focus=true;void changeSetting('font',Number(e.target.value));};$('.line-range').oninput=e=>{state.settings.focus=true;void changeSetting('line',Number(e.target.value));};$('.theme-select').onchange=e=>void changeSetting('theme',e.target.value);$('.follow-toggle').onchange=e=>{void changeSetting('follow',e.target.checked);refresh();};
  $('.restore-settings').onclick=async()=>{state.settings={...defaults};applySettings();await chrome.storage.local.set({readerSettings:state.settings});refresh();};
  $('.export-pdf').onclick=exportPDF;$('.export-md').onclick=exportMarkdown;
  $('.ask-export').onclick=()=>exportPDF('side');
  $('.export-saved').onclick=()=>{if(!state.bookmarks.length){toast('还没有收藏内容');return;}download(`# ${title()} · 收藏笔记\n\n来源：${sourceURL()}\n\n${state.bookmarks.map((b,i)=>`## ${i+1}. 回答 ${b.index+1}\n\n${b.quote}`).join('\n\n')}\n`,`${filename()}-收藏.md`);};
  document.addEventListener('mouseup',()=>setTimeout(onSelection,10));document.addEventListener('keyup',e=>{if(e.key==='Shift' || e.key.startsWith('Arrow'))onSelection();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('.selection').hidden=true;if(state.open && !state.busy)setOpen(false);}});
  const onScroll=()=>{if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=null;if(state.settings.follow){const next=visibleAnswer();if(next!==state.active){state.active=next;signature='';refresh();}}updateProgress();$('.selection').hidden=true;});};
  document.addEventListener('scroll',onScroll,true);
  window.addEventListener('popstate',()=>void syncConversation());
  const observer=new MutationObserver(records=>{if(B.active)return;if(records.every(r=>host.contains(r.target)))return;clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,260);});observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  chrome.runtime.onMessage.addListener(m=>{if(m.type==='CR_TOGGLE')setOpen(!state.open);if(m.type==='CR_UPDATE' && m.sourceKey===state.sourceKey)applyUpdate(m);});
  chrome.storage.onChanged.addListener((changes,area)=>{const doc=changes[`readerDoc:${state.sourceKey}`];if(area==='local' && doc?.newValue){state.bookmarks=doc.newValue.bookmarks || [];renderSaved();highlightBookmarks();}});
  document.addEventListener('cr-bridge-activated',()=>{host.hidden=true;state.open=false;document.documentElement.classList.remove('cr-reader-open','cr-focus');});
  document.addEventListener('cr-bridge-detached',()=>{host.hidden=false;applySettings();refresh();});
  const settings=(await chrome.storage.local.get('readerSettings')).readerSettings; if(settings)state.settings={...defaults,...settings};
  if(N){$('.surface').classList.add('native');$('.close').hidden=true;setOpen(true);document.addEventListener('cr-native-snapshot',()=>{applySettings();refresh();});document.addEventListener('cr-native-quote',consumeNativeQuote);document.addEventListener('cr-native-update',e=>{if(e.detail.sourceKey===state.sourceKey)applyUpdate(e.detail);});}
  applySettings();host.hidden=B.active;refresh();await loadDoc();if(N){consumeNativeQuote();if(N.error)toast(N.error);}
  setInterval(async()=>{
    if(B.active)return;
    applySettings();
    if(currentKey()!==state.sourceKey)await syncConversation();
    else if(!state.answers.length)refresh();
  },500);
})();
