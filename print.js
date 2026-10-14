(async () => {
  'use strict';
  const id=new URL(location.href).searchParams.get('id');
  const button=document.getElementById('print');button.disabled=true;
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try {
      // Avoid waiting forever on unavailable images from the original answer.
      await Promise.race([Promise.all([...document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});}))),new Promise(r=>setTimeout(r,4000))]);
      await document.fonts.ready;window.print();
    } finally {button.disabled=false;}
  });
  try {
    const response=await chrome.runtime.sendMessage({type:'CR_PRINT_GET',id});
    const data=response?.data;if(!data)throw new Error('预览已过期，请返回 ChatGPT 重新导出。');
    const main=document.getElementById('document');main.replaceChildren();document.title=data.title+' · ChatGPT';
    const brand=document.createElement('div');brand.className='brand';brand.textContent='CHATGPT READER';
    const title=document.createElement('h1');title.className='document-title';title.textContent=data.title;
    const meta=document.createElement('div');meta.className='meta';
    const source=document.createElement('a');source.href=window.ChatGPTReader.safeUrl(data.source);source.textContent=data.source;source.target='_blank';source.rel='noopener noreferrer';
    meta.append(document.createTextNode('导出于 '+new Date(data.created).toLocaleString()),document.createElement('br'),source);main.append(brand,title,meta);
    if(data.entries.some(e=>e.html.includes('cr-export-ui') || e.html.includes('cr-export-chart'))){const note=document.createElement('p');note.className='export-note';note.textContent='图表与控件保存为导出时的静态状态。';main.append(note);}
    if(Array.isArray(data.warnings))for(const warning of data.warnings){const note=document.createElement('p');note.className='cr-export-notice';note.textContent=String(warning);main.append(note);}
    const toc=document.createElement('nav');toc.className='toc';toc.setAttribute('aria-label','文档目录');const label=document.createElement('div');label.className='toc-title';label.textContent='内容目录';const list=document.createElement('ol');toc.append(label,list);main.append(toc);
    let headingCount=0;
    for(const [i,entry] of data.entries.entries()) {
      const article=document.createElement('article');article.className='entry';article.id=`entry-${i}`;
      const role=document.createElement('div');role.className='role';role.textContent=entry.role;
      const content=document.createElement('div');content.className='content';content.innerHTML=window.ChatGPTReader.sanitizeHTML(entry.html);
      content.querySelectorAll('img').forEach(img=>img.loading='eager');
      article.append(role,content);main.append(article);
      const headings=[...content.querySelectorAll('h1,h2,h3')];
      for(const h of headings) {h.id=`heading-${headingCount++}`;const li=document.createElement('li'),a=document.createElement('a');a.href='#'+h.id;a.textContent=h.textContent;li.append(a);list.append(li);}
      if(!headings.length){const li=document.createElement('li'),a=document.createElement('a');a.href='#'+article.id;a.textContent=`${entry.role} · ${content.textContent.trim().slice(0,45)}`;li.append(a);list.append(li);}
    }
    button.disabled=false;
  } catch(e) {const node=document.getElementById('loading') || document.createElement('p');node.className='error';node.textContent=e.message;document.getElementById('document').append(node);}
})();
