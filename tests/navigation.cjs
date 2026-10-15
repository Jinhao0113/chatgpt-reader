const {chromium}=require(process.env.READER_NODE_MODULES?require('node:path').join(process.env.READER_NODE_MODULES,'playwright'):'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.READER_TEST_WORKDIR || require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(),'reader-navigation-'));
const results=[],check=async(name,fn)=>{await fn();results.push(name);console.log('PASS '+name);};
const fixture=`<!doctype html><meta charset="utf-8"><title>目录定位验证 - ChatGPT</title><style>
body{margin:0;font:16px/1.8 sans-serif}header{position:fixed;top:0;height:70px;background:white;z-index:2;width:100%}#thread{height:100vh;overflow:auto;scroll-behavior:smooth}main{max-width:700px;margin:auto;padding:100px 30px 600px}h2{margin:0 0 20px}.space{height:650px}.katex-html{display:none}annotation{display:none}
</style><header>对话标题</header><div id="thread"><main><article data-message-author-role="assistant" data-message-id="nav-answer"><div class="markdown"><h1>目录定位测试</h1><p>开头说明</p><div class="space"></div><h2 id="second">第二节</h2><p>第二节正文</p><div class="space"></div><h2>重复标题</h2><p>第一次出现</p><div class="space"></div><h2 id="repeat-two">重复标题</h2><p>第二次出现</p><div class="space"></div><h2 id="equation">公式 <span class="katex"><span class="katex-mathml"><math><semantics><mi>x</mi><annotation encoding="application/x-tex">source-x</annotation></semantics></math></span><span class="katex-html">visual-x</span></span></h2><p>公式章节正文</p><div class="space"></div></div></article></main></div>`;
(async()=>{
  await fs.mkdir(path.join(root,'work'),{recursive:true});const profile=path.join(root,'work/navigation-test-profile');await fs.rm(profile,{recursive:true,force:true});
  const extension=path.resolve(__dirname,'..'),context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',viewport:{width:1080,height:900},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'--host-resolver-rules=MAP chatgpt.com ~NOTFOUND']});
  await context.route('https://chatgpt.com/**',r=>r.fulfill({status:200,contentType:'text/html',body:fixture}));
  const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  try{
    const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker'),id=new URL(worker.url()).host;
    const source=await context.newPage();await source.goto('https://chatgpt.com/c/navigation');await source.locator('#chatgpt-reader-launcher').waitFor({state:'attached'});
    const tabId=await worker.evaluate(async()=> (await chrome.tabs.query({url:'https://chatgpt.com/c/navigation'}))[0].id);
    const panel=await context.newPage();await panel.goto(`chrome-extension://${id}/sidepanel.html?tabId=${tabId}`);await panel.locator('.toc button').first().waitFor();
    const at=async selector=>source.waitForFunction(s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r && r.height>0 && r.top>=70 && r.top<200;},selector,{timeout:4000});
    const reset=()=>source.evaluate(()=>document.getElementById('thread').scrollTo({top:0,behavior:'instant'}));
    await check('Same-title streaming updates do not leave directory buttons pointing at detached nodes',async()=>{
      await source.evaluate(()=>{const p=document.createElement('p');p.textContent='新增的流式内容';document.querySelector('.markdown').append(p);});await panel.locator('#reader-page-snapshot').getByText('新增的流式内容',{exact:true}).waitFor({state:'attached'});
      await panel.locator('.toc button').filter({hasText:'第二节'}).click();await at('#second');await reset();
    });
    await check('Repeated headings jump to the selected occurrence in a nested scroll container',async()=>{await panel.locator('.toc button').filter({hasText:'重复标题'}).nth(1).click();await at('#repeat-two');await reset();});
    await check('Formula headings use source outline metadata without duplicate KaTeX representations',async()=>{const button=panel.locator('.toc button').filter({hasText:'公式'});assert(!(await button.textContent()).includes('source-x'));assert(!(await button.textContent()).includes('visual-x'));await button.click();await at('#equation');await reset();});
    await check('A source node replaced during scrolling is resolved again before reporting success',async()=>{
      await source.evaluate(()=>{document.getElementById('thread').addEventListener('scroll',()=>{const old=document.getElementById('second'),copy=old.cloneNode(true),spacer=document.createElement('div');spacer.style.height='380px';old.before(spacer);old.replaceWith(copy);},{once:true});});await panel.locator('.toc button').filter({hasText:'第二节'}).click();await at('#second');await reset();
    });
    await check('Paragraph directories navigate to the selected block rather than the answer start',async()=>{
      await source.evaluate(()=>{document.querySelector('.markdown').innerHTML='<p>第一段说明。</p><div class="space"></div><p id="paragraph-two">第二段说明，应该定位到这一段。</p><div class="space"></div><p>最后一段。</p>';});await panel.locator('.toc button').filter({hasText:'第二段说明'}).waitFor();await panel.locator('.toc button').filter({hasText:'第二段说明'}).click();await at('#paragraph-two');
    });
    await check('Unloaded messages produce visible feedback and refresh the directory',async()=>{
      await source.evaluate(()=>document.querySelector('article').remove());await panel.locator('.toc button').filter({hasText:'第二段说明'}).click();await panel.locator('.toast').filter({hasText:/尚未加载|已更新|未找到/}).waitFor();
    });
    await check('Navigation requests from another conversation are rejected',async()=>{const result=await panel.evaluate(async tabId=>chrome.runtime.sendMessage({type:'CR_NATIVE_JUMP',tabId,sourceKey:'/c/old',messageId:'nav-answer',text:'第二节',outline:{index:1,text:'第二节',level:2,occurrence:0}}),tabId);assert.equal(result.ok,false);assert(result.error.includes('切换'));});
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'work/navigation-test-results.json'),JSON.stringify({checks:results,errors},null,2));console.log('ALL '+results.length+' NAVIGATION CHECKS PASSED');
  }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
