const {chromium}=require(process.env.READER_NODE_MODULES?require('node:path').join(process.env.READER_NODE_MODULES,'playwright'):'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.READER_TEST_WORKDIR || require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(),'reader-paper-'));
const results=[],check=async(name,fn)=>{await fn();results.push(name);console.log('PASS '+name);};
const fixture=`<!doctype html><html class="dark"><meta charset="utf-8"><title>图文排版验证 - ChatGPT</title><style>
*{box-sizing:border-box}body{background:#111;color:#eee;font:16px/1.8 -apple-system,"PingFang SC",sans-serif;margin:0;padding:30px}main{max-width:720px;margin:auto}.answer{display:flex;flex-direction:column;gap:16px}.viewport{width:100%;aspect-ratio:16/9;background:#242424;border:1px solid #555;border-radius:16px;position:relative;flex-shrink:0}.inner{width:100%;height:100%;display:flex;align-items:center;justify-content:center}.inner img{max-width:100%;width:100%;height:100%;object-fit:contain}.overlay{position:absolute;bottom:10px;left:12px}.image-card{display:flex;flex-direction:column;gap:8px}.source{color:#bbb;font-size:12px}button{font:inherit}svg{width:100%;height:auto}svg text{fill:#eee;font-size:16px}.graph{aspect-ratio:16/9;width:100%;border:1px solid #555;padding:12px;background:#171717}
</style><main><article data-message-author-role="assistant" data-message-id="paper-answer"><div class="markdown"><div data-dil-message-id="paper-answer" class="answer">
<h1>图示与解释：清晰的阅读顺序</h1><p>图片完整显示后，再接图注、来源和正文。原始插图保留自身的浅蓝色背景。</p>
<div data-d-component="image" class="image-card cr-export-image-demo"><div class="viewport"><div class="inner"><img alt="磁场线圈结构示意图" width="680" height="500"></div><div class="overlay"><button>Open scientific illustration:</button><button>添加到收藏夹：</button></div></div><div class="source"><a href="https://example.org/illustration">示意图来源 · Example</a></div></div>
<p class="cr-export-after-image">图片后的第一段正文。这段文字必须从图片和图注下方开始，不得覆盖图像。</p><p>后续说明保持连续阅读顺序。不同图片比例、浏览器宽度和图片延迟加载，都不应导致段落重叠。</p>
<h2>坐标图：白底与深色标注</h2><div data-d-component="box" class="graph"><svg viewBox="0 0 600 260"><rect width="600" height="260" fill="#171717"/><path d="M50 30V215H570" fill="none" stroke="#bbb"/><path d="M50 200Q210 190 300 70T560 180" fill="none" stroke="#57a6ff" stroke-width="4"/><text x="65" y="24">概率密度</text><text x="510" y="242">输入量</text></svg></div>
<h2>内嵌 SVG 图片：保留完整曲线</h2><div data-d-component="box"><img data-d-component="svg" class="cr-export-encoded-svg" alt="" style="width:100%;aspect-ratio:auto 340 / 190"></div>
<h2>表格：列宽跟随纸张，文字完整换行</h2><div data-d-component="table" style="display:flex;padding:36px;max-width:100%"><table class="cr-export-table-demo" style="min-width:1000px;white-space:nowrap"><thead><tr><th style="padding:32px">方案名称</th><th style="padding:32px">原理与适用范围</th><th>验证说明</th></tr></thead><tbody><tr><td style="min-width:300px">Direct Current Drive</td><td><p>通过定向的能量交换改变粒子的分布函数，形成持续电流。这一列完整显示最后几个字。</p></td><td>支持中文及长英文标识符：unbroken_identifier_012345678901234567890123456789</td></tr><tr><td>另一种方法</td><td>第二行的全部内容也应保留。</td><td>最后一列末尾</td></tr></tbody></table></div>
<h2>Canvas 图表：同样使用浅色背景</h2><canvas width="600" height="160" aria-label="示例柱状图"></canvas><p>图表后的说明也要出现在图表下方。</p>
</div></div></article></main><script>
const c=document.createElement('canvas');c.width=680;c.height=500;const x=c.getContext('2d');x.fillStyle='#dff0f5';x.fillRect(0,0,680,500);x.lineWidth=18;
for(let i=0;i<5;i++){x.strokeStyle=['#4098ba','#278bac','#296d96','#6cbd83','#aa8dba'][i];x.beginPath();x.ellipse(340,260,210-i*17,130-i*12,.15*i,0,Math.PI*2);x.stroke();}
x.fillStyle='#173442';x.font='bold 22px sans-serif';x.fillText('MAGNETIC FIELD STRUCTURE',150,55);x.font='18px sans-serif';x.fillText('Outer coils',60,125);x.fillText('Inner coils',480,125);x.fillText('Illustration labels stay inside the image',165,465);window.photo=c.toDataURL();document.querySelector('img').src=window.photo;
const graph=document.querySelector('canvas').getContext('2d');graph.fillStyle='#171717';graph.fillRect(0,0,600,160);graph.fillStyle='#57a6ff';graph.fillRect(80,50,100,80);graph.fillRect(260,20,100,110);graph.fillRect(440,80,100,50);graph.fillStyle='white';graph.font='16px sans-serif';graph.fillText('A',125,150);graph.fillText('B',305,150);graph.fillText('C',485,150);
document.querySelector('img[data-d-component="svg"]').src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 190" fill="currentColor" style="color:rgb(237,237,237)" font-family="sans-serif"><path d="M30 20V165H325" fill="none" stroke="currentColor"/><path d="M30 165Q90 165 120 70T190 80T320 165" fill="none" stroke="#3696df" stroke-width="3"/><path d="M235 35V165" stroke="#df7e2a" stroke-width="2" stroke-dasharray="4 3"/><circle cx="235" cy="147" r="4" fill="#df7e2a"/><text x="110" y="20" fill="#3696df" font-size="12">速度分布示意</text><text x="285" y="185" font-size="11">速度</text></svg>');
</script></html>`;
(async()=>{
  await fs.mkdir(path.join(root,'work'),{recursive:true});await fs.mkdir(path.join(root,'outputs'),{recursive:true});
  const profile=path.join(root,'work/paper-test-profile');await fs.rm(profile,{recursive:true,force:true});const extension=path.resolve(__dirname,'..');
  const context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',viewport:{width:1080,height:900},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'--host-resolver-rules=MAP chatgpt.com ~NOTFOUND']});
  await context.route('https://chatgpt.com/**',r=>r.fulfill({status:200,contentType:'text/html',body:fixture}));
  const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  try{
    const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker'),id=new URL(worker.url()).host;
    const source=await context.newPage();await source.goto('https://chatgpt.com/c/paper');await source.locator('#chatgpt-reader-launcher').waitFor({state:'attached'});await source.locator('img[alt="磁场线圈结构示意图"]').evaluate(n=>n.decode());
    const tabId=await worker.evaluate(async()=> (await chrome.tabs.query({url:'https://chatgpt.com/c/paper'}))[0].id);
    const panel=await context.newPage();await panel.goto(`chrome-extension://${id}/sidepanel.html?tabId=${tabId}`);await panel.locator('.toc button').first().waitFor();
    const opened=context.waitForEvent('page');await panel.getByRole('button',{name:'导出 PDF',exact:true}).click();const preview=await opened;await preview.locator('#print:not([disabled])').waitFor();await preview.locator('img[alt="磁场线圈结构示意图"]').evaluate(n=>n.decode());
    async function geometry(){return preview.evaluate(()=>{const img=document.querySelector('img[alt="磁场线圈结构示意图"]'),card=img.closest('.cr-export-image-demo') || img.parentElement,after=document.querySelector('.cr-export-after-image');const i=img.getBoundingClientRect(),c=card.getBoundingClientRect(),a=after.getBoundingClientRect();return{image:{top:i.top,bottom:i.bottom,width:i.width,height:i.height},card:{top:c.top,bottom:c.bottom},after:{top:a.top},overflow:document.querySelector('.content').scrollWidth>document.querySelector('.content').clientWidth+1};});}
    await check('Image cards grow around images and keep following paragraphs below the complete card',async()=>{
      const g=await geometry();assert(g.card.bottom>=g.image.bottom,JSON.stringify(g));assert(g.after.top>=g.card.bottom,JSON.stringify(g));assert(Math.abs(g.image.width/g.image.height-680/500)<.02);assert(!g.overflow);
    });
    await check('White paper styling includes text, cards, SVG backgrounds and axis labels',async()=>{
      const colors=await preview.evaluate(()=>{const root=document.querySelector('.cr-export-ui'),svg=document.querySelector('svg.cr-export-chart');return{root:getComputedStyle(root).backgroundColor,text:getComputedStyle(root).color,chart:getComputedStyle(svg).backgroundColor,rect:getComputedStyle(svg.querySelector('rect')).fill,label:getComputedStyle(svg.querySelector('text')).fill};});
      assert.equal(colors.root,'rgb(255, 255, 255)');assert.equal(colors.chart,'rgb(255, 255, 255)');assert.equal(colors.rect,'rgb(255, 255, 255)');assert.notEqual(colors.label,'rgb(238, 238, 238)');assert.notEqual(colors.text,'rgb(238, 238, 238)');
    });
    await check('Image actions are omitted while a readable source link remains',async()=>{const text=await preview.locator('.content').textContent();assert(!text.includes('Open scientific illustration'));assert(!text.includes('添加到收藏夹'));assert.equal(await preview.locator('.content a[href="https://example.org/illustration"]').count(),1);});
    await check('URL-encoded SVG images retain curve geometry, markers, labels and a white background',async()=>{
      const svg=preview.locator('.content svg').filter({hasText:'速度分布示意'});assert.equal(await svg.count(),1);
      const shape=await svg.evaluate(n=>({paths:n.querySelectorAll('path').length,circles:n.querySelectorAll('circle').length,box:n.querySelectorAll('path')[1].getBBox().width,color:getComputedStyle(n).color,bg:getComputedStyle(n).backgroundColor}));assert.equal(shape.paths,3);assert.equal(shape.circles,1);assert(shape.box>200);assert.equal(shape.bg,'rgb(255, 255, 255)');assert.notEqual(shape.color,'rgb(237, 237, 237)');
    });
    await check('Wide table columns wrap without clipping or losing text at screen and print widths',async()=>{
      for(const width of [1080,560,360]){await preview.setViewportSize({width,height:900});const sizes=await preview.locator('.cr-export-table-demo').evaluate(t=>({table:t.getBoundingClientRect().width,available:t.closest('.content').clientWidth,cells:[...t.querySelectorAll('th,td')].map(n=>({w:n.clientWidth,scroll:n.scrollWidth,wrap:getComputedStyle(n).whiteSpace}))}));assert(sizes.table<=sizes.available+1,JSON.stringify(sizes));for(const c of sizes.cells){assert(c.scroll<=c.w+1,JSON.stringify(c));assert.equal(c.wrap,'normal');}}
      await preview.setViewportSize({width:1080,height:900});assert((await preview.locator('.cr-export-table-demo').textContent()).includes('最后一列末尾'));
    });
    await check('Encoded SVG input is sanitized before rendering, including base64 and malformed payloads',async()=>{
      const result=await panel.evaluate(()=>{const s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" onload="alert(1)"><script>alert(1)</script><path d="M0 0L80 60" stroke="blue"/><use href="https://evil.test/plot.svg#x"/></svg>';return{uri:ChatGPTReader.sanitizeHTML('<img src="data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s)+'">'),base:ChatGPTReader.sanitizeHTML('<img src="data:image/svg+xml;base64,'+btoa(s)+'">'),broken:ChatGPTReader.svgImage('data:image/svg+xml,%invalid')};});for(const html of [result.uri,result.base]){assert(html.includes('<svg'));assert(html.includes('M0 0L80 60'));for(const token of ['onload','alert','evil.test','<script'])assert(!html.includes(token));}assert.equal(result.broken,null);
    });
    await check('Markdown includes encoded SVG as a local vector asset with its plot and labels',async()=>{
      const result=await panel.evaluate(async tabId=>chrome.runtime.sendMessage({type:'CR_NATIVE_EXPORT',tabId,sourceKey:'/c/paper',scope:'current',messageId:'paper-answer',format:'markdown'}),tabId);assert(result.ok);const asset=result.data.assets.find(a=>a.type==='svg' && a.content.includes('速度分布示意'));assert(asset);assert(asset.content.includes('stroke-dasharray="4 3"'));assert(result.data.entries[0].text.includes(asset.name));assert(!asset.content.includes('data:image/svg+xml'));
    });
    await check('Captured Canvas background becomes light and ordinary scientific image pixels stay unchanged',async()=>{
      const pixels=await preview.evaluate(()=>[...document.querySelectorAll('.content img')].map(img=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return{alt:img.alt,pixel:[...ctx.getImageData(0,0,1,1).data]};}));
      const photo=pixels.find(p=>p.alt==='磁场线圈结构示意图'),chart=pixels.find(p=>p.alt==='示例柱状图');assert.deepEqual(photo.pixel,[223,240,245,255]);assert.deepEqual(chart.pixel,[255,255,255,255]);
    });
    await check('Narrow previews and print layout preserve image-caption-paragraph order',async()=>{
      for(const width of [1080,560,360]){await preview.setViewportSize({width,height:900});const g=await geometry();assert(g.card.bottom>=g.image.bottom-1);assert(g.after.top>=g.card.bottom-1);assert(!g.overflow);}
      await preview.setViewportSize({width:1080,height:900});await preview.emulateMedia({media:'print'});const g=await geometry();assert(g.after.top>=g.image.bottom);await preview.emulateMedia({media:'screen'});
    });
    await check('Repeated preparation stays stable after an image reload',async()=>{
      await preview.locator('img[alt="磁场线圈结构示意图"]').evaluate(async img=>{const src=img.src;img.removeAttribute('src');await new Promise(r=>requestAnimationFrame(r));img.src=src;await img.decode();await ChatGPTReader.preparePaper(document.querySelector('.content'));});const g=await geometry();assert(g.after.top>=g.card.bottom);assert(g.card.bottom>=g.image.bottom);
    });
    await preview.screenshot({path:path.join(root,'outputs/白底图文导出预览.png'),fullPage:true});await preview.emulateMedia({media:'print'});await preview.pdf({path:path.join(root,'work/paper-export.pdf'),format:'A4',preferCSSPageSize:true,printBackground:true});
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'work/paper-test-results.json'),JSON.stringify({checks:results,errors},null,2));console.log('ALL '+results.length+' PAPER EXPORT CHECKS PASSED');
  }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
