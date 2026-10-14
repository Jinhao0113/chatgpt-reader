'use strict';
// Session state survives MV3 service-worker suspension but not browser restart.
let sessions = {};
const ready = chrome.storage.session.get('readerSessions').then(v => { sessions = v.readerSessions || {}; });
let mutationQueue = Promise.resolve();
const serial = fn => { const result = mutationQueue.then(fn, fn); mutationQueue = result.catch(() => {}); return result; };
const save = () => chrome.storage.session.set({readerSessions:sessions});
const sessionForTab = id => Object.values(sessions).find(s => s.bridgeTab === id);
const alarmName = id => `reader-job:${id}`;
const isChat = url => { try { return new URL(url).origin === 'https://chatgpt.com'; } catch { return false; } };
const readers=new Map();
function panelSender(sender){return sender.url?.startsWith(chrome.runtime.getURL('sidepanel.html'));}
function broadcast(tabId,data){for(const [port,owner] of readers)if(owner===tabId){try{port.postMessage(data);}catch{readers.delete(port);}}}
async function notify(s, data) { broadcast(s.ownerTab,{type:'CR_UPDATE',sourceKey:s.sourceKey,...data}); }
chrome.sidePanel.setOptions({enabled:false}).catch(()=>{});
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(()=>{});
async function configurePanel(tabId,url,enabled=true){await chrome.sidePanel.setOptions({tabId,path:`sidepanel.html?tabId=${tabId}`,enabled:enabled && isChat(url)});}
chrome.tabs.onUpdated.addListener((tabId,info,tab)=>{if(info.url || info.status==='complete')void configurePanel(tabId,tab.url).catch(()=>{});});
chrome.runtime.onConnect.addListener(port=>{
  if(port.name!=='reader-sidepanel' || !panelSender(port.sender))return;
  port.onMessage.addListener(async m=>{
    if(m.type!=='bind' || !Number.isInteger(m.tabId))return;
    try{const tab=await chrome.tabs.get(m.tabId);if(!isChat(tab.url))return;readers.set(port,m.tabId);await chrome.tabs.sendMessage(m.tabId,{type:'CR_NATIVE_SUBSCRIBE'});}catch{}
  });
  port.onDisconnect.addListener(()=>{const id=readers.get(port);readers.delete(port);if(id && ![...readers.values()].includes(id))void chrome.tabs.sendMessage(id,{type:'CR_NATIVE_UNSUBSCRIBE'}).catch(()=>{});});
});
async function finish(s, data) {
  const id = s.job?.id;
  if (!id) return;
  s.last = {id, ...data};
  s.job = null;
  await chrome.alarms.clear(alarmName(id));
  await save();
  await notify(s, s.last);
}
async function handle(m, sender) {
  await ready;
  if (!m || typeof m.type !== 'string') return {ok:false,error:'无效请求'};
  if (m.type === 'CR_PRINT_GET') {
    if (sender.url?.startsWith(chrome.runtime.getURL('print.html'))) {
      const key=`readerPrint:${String(m.id)}`;
      return {ok:true, data:(await chrome.storage.session.get(key))[key]};
    }
    return {ok:false};
  }
  if(panelSender(sender)){
    let tab;
    try{tab=m.tabId?await chrome.tabs.get(m.tabId):(await chrome.tabs.query({active:true,lastFocusedWindow:true}))[0];}catch{}
    if(!tab || !isChat(tab.url))return {ok:false,error:'请先打开一个 ChatGPT 对话，再打开阅读助手'};
    sender={tab,frameId:0,url:sender.url};
    if(m.type==='CR_NATIVE_GET'){
      try{const result=await chrome.tabs.sendMessage(tab.id,{type:'CR_NATIVE_COLLECT'}),key=`readerQuote:${tab.id}`,quote=(await chrome.storage.session.get(key))[key];if(quote)await chrome.storage.session.remove(key);return{ok:true,tabId:tab.id,data:result.data,quote};}catch{return{ok:false,tabId:tab.id,error:'请刷新 ChatGPT 网页，让新版扩展连接到页面'};}
    }
    if(m.type==='CR_NATIVE_QUOTE_ACK'){await chrome.storage.session.remove(`readerQuote:${tab.id}`);return{ok:true};}
    if(['CR_NATIVE_JUMP','CR_NATIVE_SEARCH'].includes(m.type)){
      try{return await chrome.tabs.sendMessage(tab.id,m);}catch{return{ok:false,error:'原网页连接已断开，请刷新网页'};}
    }
    if(m.type==='CR_NATIVE_CLOSE'){
      if(chrome.sidePanel.close){await chrome.sidePanel.close({tabId:tab.id});return{ok:true};}
      return{ok:false,error:'请点击浏览器侧边栏上方的 × 关闭'};
    }
  }
  if (!sender.tab || !isChat(sender.tab.url) || sender.frameId !== 0) return {ok:false,error:'此功能只用于 ChatGPT 网页'};
  const tabId=sender.tab.id;
  if(m.type==='CR_AGENT_READY'){await configurePanel(tabId,sender.tab.url,!m.bridge);if([...readers.values()].includes(tabId))void chrome.tabs.sendMessage(tabId,{type:'CR_NATIVE_SUBSCRIBE'}).catch(()=>{});return{ok:true};}
  if(m.type==='CR_NATIVE_SNAPSHOT'){if(m.data && JSON.stringify(m.data).length<6000000)broadcast(tabId,{type:'CR_SNAPSHOT',data:m.data});return{ok:true};}
  if(m.type==='CR_NATIVE_QUOTE'){
    const data={text:String(m.data?.text||'').slice(0,12000),messageId:String(m.data?.messageId||''),sourceKey:new URL(sender.tab.url).pathname};
    await chrome.storage.session.set({[`readerQuote:${tabId}`]:data});
    broadcast(tabId,{type:'CR_NATIVE_QUOTE',data});return{ok:true};
  }
  if(m.type==='CR_OPEN_NATIVE')return{ok:true};
  if (m.type === 'CR_BRIDGE_HELLO') {
    const s=sessionForTab(tabId);
    return {ok:true, bridge:Boolean(s), job:s?.job || null};
  }
  if (m.type === 'CR_BRIDGE_CLAIM') {
    const s=sessionForTab(tabId);
    if (!s?.job || s.job.id!==m.id || s.job.phase!=='queued') return {ok:false,error:'这个问题已尝试发送。请打开后台对话确认结果；不会自动重复提交。'};
    // Persist before touching the composer so reloads cannot resubmit a job.
    s.job.phase='claimed'; await save(); return {ok:true};
  }
  if (m.type === 'CR_BRIDGE_UPDATE') {
    const s=sessionForTab(tabId);
    if (!s?.job || s.job.id !== m.id) return {ok:false};
    const payload={id:m.id, status:m.status, text:String(m.text || '').slice(0,500000), html:String(m.html || '').slice(0,1500000), error:String(m.error || '').slice(0,500), retryable:m.retryable===true && s.job.phase==='queued', url:isChat(sender.tab.url) ? sender.tab.url : ''};
    if (!['working','streaming','done','error','stopped'].includes(payload.status)) return {ok:false};
    s.threadUrl=payload.url;
    if (['done','error','stopped'].includes(payload.status)) await finish(s,payload);
    else { s.last=payload; await save(); await notify(s,payload); }
    return {ok:true};
  }
  const sourceKey=new URL(sender.tab.url).pathname;
  const key=`${tabId}:${sourceKey}`;
  if (m.sourceKey && m.sourceKey !== sourceKey) return {ok:false,error:'原对话已切换，请重新提问'};
  if (m.type === 'CR_STATE') {
    const s=sessions[key];
    return {ok:true, busy:Boolean(s?.job), last:s?.last || null, url:s?.threadUrl || ''};
  }
  if (m.type === 'CR_ASK') {
    const prompt=String(m.prompt || '').trim(), id=String(m.id || '');
    if (!prompt || prompt.length > 24000 || !/^[\w-]{8,80}$/.test(id)) return {ok:false,error:'问题为空或过长（最多 24,000 字）'};
    let s=sessions[key];
    if (s?.job) return {ok:false,error:'上一条追问还在回答中'};
    if (s) {
      try { const tab=await chrome.tabs.get(s.bridgeTab); if (!isChat(tab.url || tab.pendingUrl)) s=null; } catch { s=null; }
    }
    if (!s) { s={ownerTab:tabId,sourceKey,bridgeTab:null,threadUrl:'',job:null}; sessions[key]=s; }
    s.job={id,prompt,created:Date.now(),phase:'queued'};
    s.last={id,status:'working',text:'',html:'',url:s.threadUrl};
    await save();
    await chrome.alarms.create(alarmName(id), {delayInMinutes:5});
    try {
      if (!s.bridgeTab) {
        const tab=await chrome.tabs.create({url:'https://chatgpt.com/',active:false,openerTabId:tabId});
        s.bridgeTab=tab.id;
        await chrome.tabs.update(tab.id,{autoDiscardable:false});
        await save();
        // A handshake recovers the job even when the content script loads first.
        try { await chrome.tabs.sendMessage(tab.id,{type:'CR_BRIDGE_JOB',job:s.job}); } catch { /* waits for DOM-ready handshake */ }
      } else {
        await chrome.tabs.update(s.bridgeTab,{autoDiscardable:false});
        await chrome.tabs.sendMessage(s.bridgeTab,{type:'CR_BRIDGE_JOB',job:s.job});
      }
      await notify(s,s.last);
      return {ok:true};
    } catch (e) { const error='无法连接后台对话。请打开后台标签页完成登录，然后重试。'; await finish(s,{status:'error',error}); return {ok:false,error}; }
  }
  if (m.type === 'CR_STOP') {
    const s=sessions[key];
    if (s?.job) {
      try { await chrome.tabs.sendMessage(s.bridgeTab,{type:'CR_BRIDGE_STOP',id:s.job.id}); } catch { await finish(s,{status:'stopped',text:s.last?.text || '',html:s.last?.html || ''}); }
    }
    return {ok:true};
  }
  if (m.type === 'CR_OPEN_BRIDGE') {
    const s=sessions[key];
    if (s?.bridgeTab) { try { await chrome.tabs.update(s.bridgeTab,{active:true}); return {ok:true}; } catch {} }
    return {ok:false,error:'尚未创建侧边对话'};
  }
  if (m.type === 'CR_RESET') {
    const s=sessions[key];
    if (s?.job) return {ok:false,error:'请先停止当前回答'};
    // Leave the user's ChatGPT history and tabs intact.
    if (s?.bridgeTab) { try { await chrome.tabs.sendMessage(s.bridgeTab,{type:'CR_BRIDGE_DETACH'}); } catch {} }
    delete sessions[key]; await save(); return {ok:true};
  }
  if (m.type === 'CR_PRINT') {
    const data=m.data;
    if (!data || !Array.isArray(data.entries) || JSON.stringify(data).length>6000000) return {ok:false,error:'导出内容过大，请导出单条回答'};
    const id=crypto.randomUUID();
    await chrome.storage.session.set({[`readerPrint:${id}`]:data});
    await chrome.tabs.create({url:chrome.runtime.getURL(`print.html?id=${id}`)});
    await chrome.alarms.create(`reader-print:${id}`,{delayInMinutes:30});
    return {ok:true};
  }
  return {ok:false,error:'未知操作'};
}
chrome.runtime.onMessage.addListener((m,sender,reply) => {
  // open() must run directly in the user-gesture message, before async storage.
  let opening=Promise.resolve();
  if(['CR_OPEN_NATIVE','CR_NATIVE_QUOTE'].includes(m?.type) && sender.tab && isChat(sender.tab.url))opening=chrome.sidePanel.open({tabId:sender.tab.id});
  serial(async()=>{const result=await handle(m,sender);await opening;return result;}).then(reply,e=>reply({ok:false,error:e.message}));return true;
});
chrome.alarms.onAlarm.addListener(alarm => serial(async () => {
  await ready;
  if (alarm.name.startsWith('reader-print:')) { await chrome.storage.session.remove(`readerPrint:${alarm.name.slice(13)}`); return; }
  const id=alarm.name.slice('reader-job:'.length);
  const s=Object.values(sessions).find(s => s.job?.id === id);
  if (s) {
    try { await chrome.tabs.sendMessage(s.bridgeTab,{type:'CR_BRIDGE_STOP',id}); } catch {}
    await finish(s,{status:'error',text:s.last?.text || '',html:s.last?.html || '',error:'等待超过 5 分钟。请打开后台对话检查登录、额度或网页提示。'});
  }
}));
chrome.tabs.onRemoved.addListener(tabId => serial(async () => {
  await ready;
  for (const [key,s] of Object.entries(sessions)) {
    if (s.bridgeTab === tabId) { if (s.job) await finish(s,{status:'error',error:'后台 ChatGPT 标签页已关闭，请重新发送'}); s.bridgeTab=null; }
    if (s.ownerTab === tabId) { if (s.job) { try { await chrome.tabs.sendMessage(s.bridgeTab,{type:'CR_BRIDGE_STOP',id:s.job.id}); } catch {} await chrome.alarms.clear(alarmName(s.job.id)); } delete sessions[key]; }
  }
  await save();
}));
chrome.commands.onCommand.addListener(async name=>{if(name!=='toggle-reader')return;const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(tab && isChat(tab.url)){if([...readers.values()].includes(tab.id)&&chrome.sidePanel.close)await chrome.sidePanel.close({tabId:tab.id});else await chrome.sidePanel.open({tabId:tab.id});}});
