(() => {
  'use strict';
  const R=window.ChatGPTReader, root=document.getElementById('reader-page-snapshot');
  const N={tabId:Number(new URL(location.href).searchParams.get('tabId')) || null,url:'https://chatgpt.com/',title:'ChatGPT 对话',visibleId:'',progress:0,heading:'',dark:false,pendingQuote:null};
  window.ChatGPTReaderNative=N;
  let resolveReady;N.ready=new Promise(resolve=>resolveReady=resolve);
  N.rpc=async m=>{try{return await chrome.runtime.sendMessage({tabId:N.tabId,...m});}catch{return{ok:false,error:'连接已断开，请刷新 ChatGPT 后重新打开阅读助手'};}};
  N.jump=(id,text)=>N.rpc({type:'CR_NATIVE_JUMP',messageId:id,text});
  N.search=(query,index,scroll)=>N.rpc({type:'CR_NATIVE_SEARCH',query,index,scroll});
  N.rescan=async()=>{const result=await N.rpc({type:'CR_NATIVE_GET'});if(result.data)render(result.data);return result;};
  N.close=()=>N.rpc({type:'CR_NATIVE_CLOSE'});
  function render(data) {
    if(!data || !Array.isArray(data.entries))return;
    N.url=data.url;N.title=data.title;N.visibleId=data.visibleId;N.progress=data.progress;N.heading=data.heading;N.dark=data.dark;N.generating=data.generating;
    const existing=new Map([...root.children].map(n=>[n.dataset.nativeId,n]));
    const keep=new Set();
    for(const entry of data.entries) {
      let node=existing.get(entry.id);
      if(!node){node=document.createElement('article');node.dataset.nativeId=entry.id;node.dataset.messageId=entry.id;node.innerHTML='<div class="markdown"></div>';}
      node.dataset.messageAuthorRole=entry.role;
      const body=node.firstElementChild,html=R.sanitizeHTML(entry.html);
      if(body.innerHTML!==html)body.innerHTML=html;
      keep.add(node);root.append(node);
    }
    for(const node of existing.values())if(!keep.has(node))node.remove();
    document.dispatchEvent(new Event('cr-native-snapshot'));
  }
  function quote(data){N.pendingQuote=data;document.dispatchEvent(new Event('cr-native-quote'));}
  let port;
  function connect(){
    port=chrome.runtime.connect({name:'reader-sidepanel'});
    port.onMessage.addListener(m=>{
      if(m.type==='CR_SNAPSHOT')render(m.data);
      if(m.type==='CR_NATIVE_QUOTE'){quote(m.data);void N.rpc({type:'CR_NATIVE_QUOTE_ACK'});}
      if(m.type==='CR_UPDATE')document.dispatchEvent(new CustomEvent('cr-native-update',{detail:m}));
    });
    port.onDisconnect.addListener(()=>{setTimeout(()=>{connect();void N.rescan();},500);});
    port.postMessage({type:'bind',tabId:N.tabId});
  }
  connect();
  N.rpc({type:'CR_NATIVE_GET'}).then(result=>{
    N.tabId=result.tabId || N.tabId;
    if(result.data)render(result.data);
    if(result.quote)quote(result.quote);
    if(result.error)N.error=result.error;
    port.postMessage({type:'bind',tabId:N.tabId});
    resolveReady();
  }).catch(()=>resolveReady());
})();
