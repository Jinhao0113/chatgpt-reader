const {chromium}=require(process.env.READER_NODE_MODULES?require('node:path').join(process.env.READER_NODE_MODULES,'playwright'):'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.READER_TEST_WORKDIR || require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(),'reader-rich-tests-'));
const results=[],check=async(name,fn)=>{await fn();results.push(name);console.log('PASS '+name);};
// Component attributes observed in the current logged-in Intelligent UI renderer.
// All text and graphics below are synthetic; no account/chat data is included.
const fixture=`<!doctype html><html class="dark"><meta charset="utf-8"><title>Intelligent UI 导出示例 - ChatGPT</title><style>
body{margin:0;padding:30px;background:#212121;color:#ececec;font:16px/1.7 -apple-system,"PingFang SC",sans-serif}main{max-width:720px;margin:auto}h1{font-size:25px}h2{font-size:20px}svg{width:100%;height:auto}.cards{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{background:#303030;border:1px solid #555;border-radius:12px;padding:14px}.chart{background:#171717;border:1px solid #555;border-radius:12px;padding:12px;margin:15px 0}.chart text{fill:#ddd;font-size:14px}.curve{fill:none;stroke:#57a6ff;stroke-width:4}.axis{stroke:#aaa;stroke-width:1}table{width:100%;border-collapse:collapse}td,th{border:1px solid #555;padding:6px}canvas{width:100%;height:auto}label{display:block;margin:10px 0}button,input,select{font:inherit}input{accent-color:#aaa}
</style><main>
<article data-message-author-role="user" data-message-id="u1">用图示比较三个模型。</article>
<div data-chatgpt-selection-message-id="iui-1"><div data-markdown-text-style="assistant-message"><p>图示之前的说明。</p></div>
<div data-dil-source-message-id="iui-1"><div data-dil-message-id="iui-1" data-d-direction="col"><h1 data-d-component="title">Intelligent UI：模型比较</h1>
<div class="cards" data-d-component="box"><div class="card"><strong>方案 A</strong><p>响应速度 80 ms</p></div><div class="card"><strong>方案 B</strong><p>响应速度 120 ms</p></div></div>
<h2>分布曲线</h2><div class="chart" data-d-component="box"><svg viewBox="0 0 600 270" role="img" aria-label="分布曲线"><title>分布曲线与参考值</title><defs><linearGradient id="blue"><stop offset="0" stop-color="#57a6ff"/><stop offset="1" stop-color="#057dff"/></linearGradient></defs><path class="axis" d="M45 220H570M45 220V25"/><path class="curve" d="M50 210 Q150 205 200 135 T350 120 T550 210"/><circle cx="350" cy="120" r="7" fill="url(#blue)"/><text x="50" y="250">输入量</text><text x="50" y="20">概率密度</text><text x="365" y="110">参考值</text></svg></div>
<h2>当前参数</h2><label for="threshold">阈值</label><input id="threshold" type="range" min="0" max="100" value="20"><select aria-label="模型"><option>模型 A</option><option selected>模型 B</option></select><input aria-label="显示网格" type="checkbox" checked><input type="password" value="do-not-export"><button aria-pressed="true">对比模式</button>
<h2>Canvas 图表</h2><canvas width="600" height="180" aria-label="当前柱状图"></canvas>
<h2>数据与公式</h2><div data-d-component="table"><table><tr><th>模型</th><th>结果</th></tr><tr><td>A</td><td>0.8</td></tr><tr><td>B</td><td>0.6</td></tr></table></div><div data-d-component="math"><math display="block"><mrow><mi>y</mi><mo>=</mo><msup><mi>x</mi><mn>2</mn></msup></mrow></math></div>
<iframe hidden title="DIL execution sandbox" src="https://cdn.platform.openai.com/deployments/dil/v14/runner.html"></iframe>
<details><summary>未展开的补充</summary><p>隐藏详情不应泄露</p></details>
</div></div><div data-markdown-text-style="assistant-message"><p>图示之后的总结。</p></div></div>
</main><div data-chatgpt-composer><div data-composer-markdown contenteditable="true" role="textbox" aria-label="询问 ChatGPT"></div><button aria-label="发送" disabled>发送</button></div><script>
document.querySelector('#threshold').value='75';const c=document.querySelector('canvas').getContext('2d');c.fillStyle='#171717';c.fillRect(0,0,600,180);c.fillStyle='#57a6ff';c.fillRect(70,70,100,80);c.fillRect(240,30,100,120);c.fillRect(410,100,100,50);c.fillStyle='#eee';c.font='18px sans-serif';c.fillText('A',110,170);c.fillText('B',280,170);c.fillText('C',450,170);
const box=document.querySelector('[data-composer-markdown]'),send=document.querySelector('button[aria-label="发送"]');box.oninput=()=>send.disabled=!box.textContent.trim();send.onclick=()=>{box.textContent='';send.disabled=true;const stop=document.createElement('button');stop.dataset.testid='stop-button';stop.textContent='停止';send.after(stop);setTimeout(()=>{const copy=document.querySelector('[data-chatgpt-selection-message-id]').cloneNode(true);copy.dataset.chatgptSelectionMessageId='generated-ui';copy.querySelector('[data-dil-message-id]').dataset.dilMessageId='generated-ui';copy.querySelector('#threshold').value='88';copy.querySelector('canvas').getContext('2d').drawImage(document.querySelector('canvas'),0,0);document.querySelector('main').append(copy);stop.remove();send.disabled=false;},500);};
</script></html>`;
(async()=>{
  await fs.mkdir(path.join(root,'work'),{recursive:true});await fs.mkdir(path.join(root,'outputs'),{recursive:true});
  const profile=path.join(root,'work/rich-test-profile');await fs.rm(profile,{recursive:true,force:true});
  const context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',viewport:{width:1080,height:900},args:[`--disable-extensions-except=${path.resolve(__dirname,'..')}`,`--load-extension=${path.resolve(__dirname,'..')}`,'--host-resolver-rules=MAP chatgpt.com ~NOTFOUND']});
  await context.route('https://chatgpt.com/**',r=>r.request().resourceType()==='document'?r.fulfill({status:200,contentType:'text/html',body:fixture}):r.abort());
  await context.route('https://cdn.platform.openai.com/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<p>Hidden execution sandbox</p>'}));
  const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  try{
    const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker'),id=new URL(worker.url()).host;
    const source=await context.newPage();await source.goto('https://chatgpt.com/c/intelligent');await source.locator('#chatgpt-reader-launcher').waitFor({state:'attached'});
    const tabId=await worker.evaluate(async()=> (await chrome.tabs.query({url:'https://chatgpt.com/c/intelligent'}))[0].id);
    const panel=await context.newPage();await panel.goto(`chrome-extension://${id}/sidepanel.html?tabId=${tabId}`);await panel.locator('.toc button').first().waitFor();
    await check('Mixed Markdown and native DIL components form one stable answer',async()=>{assert.equal(await panel.locator('.answer-select option').count(),1);assert.equal(await panel.locator('.toc button').count(),5);assert((await panel.locator('#reader-page-snapshot').textContent()).includes('图示之前'));assert((await panel.locator('#reader-page-snapshot').textContent()).includes('图示之后'));});
    let preview;
    await check('PDF captures current controls, SVG, Canvas, cards, table and MathML',async()=>{
      const event=context.waitForEvent('page');await panel.getByRole('button',{name:'导出 PDF',exact:true}).click();preview=await event;await preview.locator('#print:not([disabled])').waitFor();
      assert.equal(await preview.locator('.content svg').count(),1);assert.equal(await preview.locator('.content img[src^="data:image/png"]').count(),1);assert.equal(await preview.locator('.content table').count(),1);assert.equal(await preview.locator('.content math').count(),1);
      const text=await preview.locator('.content').textContent();for(const expected of ['图示之前','图示之后','阈值：75','模型：模型 B','显示网格：已选中','对比模式（已选中）'])assert(text.includes(expected),expected);
      for(const secret of ['do-not-export','隐藏详情不应泄露','Hidden execution sandbox'])assert(!text.includes(secret));
      assert.equal(await preview.locator('.content input,.content select,.content button,.content iframe,.content script').count(),0);assert.equal(await preview.locator('.cr-export-notice').count(),0);
      await preview.screenshot({path:path.join(root,'outputs/Intelligent-UI-导出预览.png'),fullPage:true});await preview.pdf({path:path.join(root,'work/intelligent-export.pdf'),format:'A4',preferCSSPageSize:true,printBackground:true});
    });
    await check('Dark curve colors, local gradients and column layout survive sanitization',async()=>{
      const colors=await preview.locator('.content svg').evaluate(n=>({bg:getComputedStyle(n).backgroundColor,stroke:getComputedStyle(n.querySelector('.curve') || n.querySelectorAll('path')[1]).stroke,fill:n.querySelector('circle').getAttribute('fill'),ids:[...n.querySelectorAll('[id]')].map(x=>x.id)}));
      assert.equal(colors.bg,'rgb(23, 23, 23)');assert.equal(colors.stroke,'rgb(87, 166, 255)');assert(colors.fill.includes(colors.ids[0]));assert((await preview.locator('.content [style*="grid-template-columns"]').getAttribute('style')).includes('repeat(2'));
      const bounds=await preview.locator('.content').evaluate(n=>({client:n.clientWidth,scroll:n.scrollWidth}));assert(bounds.scroll<=bounds.client+2);
    });
    await check('Markdown with graphics downloads a ZIP with SVG and Canvas image assets',async()=>{const event=panel.waitForEvent('download');await panel.getByRole('button',{name:'Markdown',exact:true}).click();const d=await event;assert(d.suggestedFilename().endsWith('-Markdown.zip'));await d.saveAs(path.join(root,'work/intelligent-markdown.zip'));});
    await check('Completed side answers synchronize rich graphics and export them to PDF',async()=>{
      await panel.getByRole('tab',{name:'追问',exact:true}).click();await panel.locator('.ask-input').fill('用交互图表解释');const opened=context.waitForEvent('page');await panel.locator('.ask-send').click();const bridge=await opened;await bridge.goto('https://chatgpt.com/');await bridge.locator('#chatgpt-reader-launcher').waitFor({state:'attached'});
      await panel.locator('.status').filter({hasText:'回答已完成'}).waitFor({timeout:22000});assert.equal(await panel.locator('.message.assistant .rich svg').count(),1);assert.equal(await panel.locator('.message.assistant .rich img[src^="data:image/png"]').count(),1);
      await panel.getByRole('tab',{name:'目录',exact:true}).click();await panel.getByRole('combobox',{name:'导出范围'}).selectOption('side');const event=context.waitForEvent('page');await panel.getByRole('button',{name:'导出 PDF',exact:true}).click();const side=await event;await side.locator('#print:not([disabled])').waitFor();assert.equal(await side.locator('.content svg').count(),1);assert((await side.locator('.content').allTextContents()).join(' ').includes('阈值：88'));await side.close();
    });
    await check('Side Markdown bundles its stored SVG and Canvas graphics',async()=>{const event=panel.waitForEvent('download');await panel.getByRole('button',{name:'Markdown',exact:true}).click();await(await event).saveAs(path.join(root,'work/side-intelligent-markdown.zip'));await panel.getByRole('combobox',{name:'导出范围'}).selectOption('current');});
    await check('Source-export route rejects stale conversations',async()=>{const result=await panel.evaluate(async tabId=>chrome.runtime.sendMessage({type:'CR_NATIVE_EXPORT',tabId,sourceKey:'/c/other',scope:'all',format:'pdf'}),tabId);assert.equal(result.ok,false);assert(result.error.includes('已切换'));});
    await check('Unreadable embeds produce an explicit note, while hidden sandbox stays omitted',async()=>{
      await source.evaluate(()=>{const frame=document.createElement('iframe');frame.src='https://example.com/widget';frame.title='External widget';document.querySelector('[data-dil-message-id]').append(frame);});
      const result=await panel.evaluate(async tabId=>chrome.runtime.sendMessage({type:'CR_NATIVE_EXPORT',tabId,sourceKey:'/c/intelligent',scope:'all',format:'pdf'}),tabId);assert(result.ok);assert.equal(result.data.warnings.length,1);assert(result.data.entries[1].html.includes('嵌入内容无法读取'));
    });
    await check('SVG scripting, remote resources and unsafe CSS are removed',async()=>{
      const html=await panel.evaluate(()=>ChatGPTReader.sanitizeHTML('<svg viewBox="0 0 100 100" onload="alert(1)"><script>alert(1)</script><use href="https://evil.test/a.svg#x"/><use href="#local"/><foreignObject><div onclick="x()"><iframe src="https://evil.test"></iframe>Label</div></foreignObject><animate attributeName="href" to="javascript:x()"/><path fill="url(https://evil.test/x)" d="M0 0"/></svg><p style="position:fixed;background-image:url(https://evil.test/x);color:red" onclick="x()">Safe</p>'));
      for(const token of ['onload','onclick','alert(','evil.test','<animate','<iframe','position:','background-image:'])assert(!html.includes(token),token);
      assert(html.includes('href="#local"'));assert(html.includes('Label'));assert(html.includes('color: red'));
    });
    await check('Repeated sanitization retains flex direction, borders and rounded corners',async()=>{
      const result=await panel.evaluate(()=>{const html='<div style="display:flex;flex-direction:column;border:1px solid red;border-radius:12px"><p>Card</p></div>';const once=ChatGPTReader.sanitizeHTML(html),twice=ChatGPTReader.sanitizeHTML(once);return{once,twice};});
      assert.equal(result.once,result.twice);assert(result.twice.includes('column'));assert(result.twice.includes('1px solid red'));assert(result.twice.includes('12px'));
    });
    await check('Repeated charts receive separate definition IDs in a full conversation export',async()=>{
      await source.evaluate(()=>{const copy=document.querySelector('[data-chatgpt-selection-message-id]').cloneNode(true);copy.dataset.chatgptSelectionMessageId='iui-2';copy.querySelector('[data-dil-message-id]').dataset.dilMessageId='iui-2';copy.querySelectorAll('iframe,canvas').forEach(n=>n.remove());document.querySelector('main').append(copy);});
      const result=await panel.evaluate(async tabId=>chrome.runtime.sendMessage({type:'CR_NATIVE_EXPORT',tabId,sourceKey:'/c/intelligent',scope:'all',format:'pdf'}),tabId);assert(result.ok);assert.equal(result.data.entries.length,3);
      const ids=result.data.entries.flatMap(e=>[...e.html.matchAll(/id="(crchart-[^"]+)"/g)].map(m=>m[1]));assert.equal(ids.length,new Set(ids).size);assert.equal(ids.length,2);
    });
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'work/rich-test-results.json'),JSON.stringify({checks:results,errors},null,2));console.log('ALL '+results.length+' RICH EXPORT CHECKS PASSED');
  }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
