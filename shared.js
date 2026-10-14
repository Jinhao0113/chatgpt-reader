/* Shared by the isolated content script and the extension's print preview. */
(() => {
  'use strict';
  const allowedTags = new Set(('p div section span br hr h1 h2 h3 h4 h5 h6 strong b em i u s del blockquote pre code ul ol li table thead tbody tfoot tr th td caption a img figure figcaption details summary sub sup kbd mark math semantics annotation mrow mi mn mo mfrac msqrt mroot msub msup msubsup munder mover munderover mtext mspace mtable mtr mtd menclose mpadded mstyle').split(' '));
  const allowedAttrs = new Set(('href src alt title colspan rowspan start class display mathvariant encoding stretchy fence separator accent accentunder columnalign rowalign columnspacing rowspacing width height depth notation style open data-cr-asset data-cr-ui').split(' '));
  const svgTags = new Set('svg g path rect circle ellipse line polyline polygon text tspan title desc defs lineargradient radialgradient stop clippath mask pattern marker use symbol foreignobject'.split(' '));
  const svgAttrs = new Set('viewbox xmlns xmlns:xlink x y x1 y1 x2 y2 cx cy r rx ry d points fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset opacity transform gradienttransform gradientunits offset stop-color stop-opacity clippathunits clip-path mask maskunits patternunits patterntransform marker-start marker-mid marker-end markerwidth markerheight refx refy orient text-anchor dominant-baseline font-size font-family font-weight id href xlink:href preserveaspectratio vector-effect'.split(' '));
  const styleProps = new Set('color background-color display flex-direction flex-wrap flex-grow flex-shrink flex-basis justify-content align-items align-content align-self gap row-gap column-gap grid-template-columns grid-column grid-row padding padding-top padding-right padding-bottom padding-left margin margin-top margin-right margin-bottom margin-left border border-top border-right border-bottom border-left border-radius border-color border-style border-width font-size font-weight font-style font-family line-height letter-spacing text-align text-decoration white-space vertical-align aspect-ratio width height max-width max-height min-width min-height fill stroke stroke-width opacity'.split(' '));
  const assetPath = value => /^assets\/chart-\d+\.(svg|png)$/.test(value);
  function safeStyle(value) {
    const style=document.createElement('span').style;style.cssText=value;
    const safe=document.createElement('span').style;
    // Iterate allowed properties, since the CSSOM may serialize border/flex
    // shorthands differently after each sanitization pass.
    for(const property of styleProps) {
      const v=style.getPropertyValue(property);
      if(v && !/url\s*\(|expression|@|[<>\\]/i.test(v) && !/position|animation|content|behavior/i.test(v)) safe.setProperty(property,v);
    }
    return safe.cssText;
  }
  const safeUrl = value => {
    try { const u = new URL(value, 'https://chatgpt.com'); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
  };
  function sanitizeHTML(html) {
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    doc.querySelectorAll('script,style,iframe,object,embed,input,textarea,button,select,video,audio,canvas,.katex-html,[data-cr-owned]').forEach(n => n.remove());
    // Prefer native MathML so equations remain readable without remote font assets.
    doc.querySelectorAll('annotation').forEach(n => n.remove());
    for (const el of [...doc.body.querySelectorAll('*')]) {
      const isSVG=el.namespaceURI==='http://www.w3.org/2000/svg',tag=el.localName.toLowerCase();
      if (isSVG ? !svgTags.has(tag) : !allowedTags.has(tag)) { if(isSVG)el.remove();else el.replaceWith(...el.childNodes);continue; }
      for (const a of [...el.attributes]) {
        const name=a.name.toLowerCase();
        if (!(allowedAttrs.has(name) || (isSVG && svgAttrs.has(name)))) el.removeAttribute(a.name);
        else if(name==='style') {const safe=safeStyle(a.value);if(safe)el.setAttribute('style',safe);else el.removeAttribute(a.name);}
        else if(name==='data-cr-asset' && !assetPath(a.value))el.removeAttribute(a.name);
        else if(isSVG && ['href','xlink:href'].includes(name)){if(!/^#[\w:.-]+$/.test(a.value))el.removeAttribute(a.name);}
        else if(isSVG && /url\s*\(/i.test(a.value) && !/^url\(["']?#[\w:.-]+["']?\)$/.test(a.value))el.removeAttribute(a.name);
        else if (['href', 'src'].includes(a.name)) {
          const url = name==='src' && /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(a.value) ? a.value : safeUrl(a.value);
          if (url) el.setAttribute(a.name, url); else el.removeAttribute(a.name);
        } else if (a.name === 'class') {
          el.setAttribute('class', a.value.split(/\s+/).filter(c => /^(katex|language-|math|cr-export-)/.test(c)).join(' '));
        }
      }
      if (el.localName === 'a') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
      if (el.localName === 'img') { el.setAttribute('loading', 'lazy'); el.setAttribute('referrerpolicy', 'no-referrer'); }
    }
    return doc.body.innerHTML;
  }
  const bodySelector='.markdown, .prose, [data-markdown-text-style="assistant-message"], [data-markdown-text-style="user-message"]';
  function messageBody(node) {
    if(node.matches(bodySelector))return node;
    // Keep mixed Markdown/Intelligent UI fragments together in the same turn.
    const bodies=[...node.querySelectorAll(bodySelector)].filter(n=>!n.parentElement.closest(bodySelector));
    if(bodies.length>1 || (node.querySelector('[data-dil-message-id]') && !bodies[0]?.querySelector('[data-dil-message-id]')))return node;
    return bodies[0] || node.querySelector('[class*="markdown"]') || node;
  }
  const explicitRoles = {
    assistant:'[data-message-author-role="assistant"], [data-author="assistant"], [data-role="assistant"], [data-message-type="assistant"], [data-testid="assistant-message"], [data-turn="assistant"], [data-markdown-text-style="assistant-message"]',
    user:'[data-message-author-role="user"], [data-author="user"], [data-role="user"], [data-message-type="user"], [data-testid="user-message"], [data-turn="user"], [data-markdown-text-style="user-message"]'
  };
  const markerSelector='[data-message-author-role], [data-cr-role]';
  let marked=new Set();
  function labelRole(node) {
    const text=node.textContent.trim().replace(/\s+/g,' ');
    if (/^(?:ChatGPT\s*(?:说|said|says)?|Assistant)\s*[：:]?$/i.test(text)) return 'assistant';
    if (/^(?:你说|您说|You said|You|用户|User)\s*[：:]?$/i.test(text)) return 'user';
    return '';
  }
  function messageNodes() {
    const roles=new Map();
    const own=n=>Boolean(n.closest('[data-cr-owned]'));
    for(const [role,selector] of Object.entries(explicitRoles)) for(const n of document.querySelectorAll(selector)) if(!own(n))roles.set(n.closest('[data-chatgpt-selection-message-id]') || n,role);
    for(const n of document.querySelectorAll('[data-dil-message-id]'))if(!own(n) && !n.closest(explicitRoles.user))roles.set(n.closest('[data-chatgpt-selection-message-id]') || n.closest(explicitRoles.assistant) || n, 'assistant');
    const labels=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')].filter(n=>!own(n) && !n.closest('.markdown,.prose') && labelRole(n));
    // Current and historical ChatGPT renderers may expose only an accessible
    // speaker heading, without data-message-author-role.
    for(const label of labels) {
      const role=labelRole(label), nextLabel=labels.find(n=>label.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING);
      const after=n=>Boolean(label.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING) && (!nextLabel || Boolean(n.compareDocumentPosition(nextLabel)&Node.DOCUMENT_POSITION_FOLLOWING));
      let parent=label, found=null;
      for(let depth=0;depth<6 && parent && parent!==document.body && !found;depth++,parent=parent.parentElement) {
        const selector=role==='assistant'?'.markdown,.prose,[data-testid="assistant-message"]':'[data-testid="user-message"],.whitespace-pre-wrap,.user-message';
        found=[...parent.querySelectorAll(selector)].find(n=>after(n) && !own(n) && (!nextLabel || !n.contains(nextLabel)));
        if(!found) for(let sibling=parent.nextElementSibling;sibling;sibling=sibling.nextElementSibling) {
          if(nextLabel && (sibling===nextLabel || sibling.contains(nextLabel)))break;
          if(!after(sibling) || own(sibling))continue;
          const rich=sibling.matches(selector)?sibling:sibling.querySelector(selector);
          if(rich){found=rich;break;}
          if(!sibling.matches('button,script,style') && (sibling.querySelector('p,h1,h2,h3,pre,table,math') || (role==='user' && sibling.textContent.trim()))) {found=sibling;break;}
        }
      }
      if(found && ![...roles].some(([n])=>n.contains(found)))roles.set(found,role);
    }
    // Legacy markdown-only replies remain readable even without a speaker label.
    for(const n of document.querySelectorAll('.markdown,.prose')) {
      if(own(n) || n.closest(explicitRoles.user) || [...roles].some(([p])=>p.contains(n) || n.contains(p)))continue;
      roles.set(n,'assistant');
    }
    const nodes=[...roles.keys()].filter(n=>![...roles.keys()].some(p=>p!==n && p.contains(n)));
    const current=new Set(nodes);
    for(const n of marked)if(!current.has(n))delete n.dataset.crRole;
    for(const n of nodes)n.dataset.crRole=roles.get(n);
    marked=current;
    return nodes.sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
  }
  function roleOf(node) { return node.dataset.crRole || node.dataset.messageAuthorRole || ''; }
  function assistantNodes() { return messageNodes().filter(n=>roleOf(n)==='assistant'); }
  function userNodes() { return messageNodes().filter(n=>roleOf(n)==='user'); }
  function closestMessage(node,role) { const n=node.closest(markerSelector); return n && (!role || roleOf(n)===role)?n:null; }
  function messageId(node, index) {
    const turn=node.closest('[data-message-id],[data-turn-id],[data-testid^="conversation-turn-"],[data-chatgpt-selection-message-id],[data-dil-message-id]');
    const stable=node.dataset.messageId || node.dataset.chatgptSelectionMessageId || node.dataset.dilMessageId || turn?.dataset.messageId || turn?.dataset.chatgptSelectionMessageId || turn?.dataset.dilMessageId || turn?.dataset.turnId || turn?.dataset.testid;
    if(stable)return stable;
    const text=messageBody(node).textContent.trim().replace(/\s+/g,' ').slice(0,160);
    let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return text?`message-${(hash>>>0).toString(36)}`:`answer-${index}`;
  }
  function outline(node) {
    const body = messageBody(node);
    const headings = [...body.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(n => n.textContent.trim());
    if (headings.length) return headings.map(n => ({node:n, text:n.textContent.trim(), level:Number(n.localName[1])}));
    const bold = [...body.querySelectorAll('p > strong:first-child, li > strong:first-child')].filter(n => n.textContent.trim().length <= 80);
    if (bold.length >= 2) return bold.slice(0, 40).map(n => ({node:n, text:n.textContent.trim(), level:2}));
    return [...body.querySelectorAll('p,pre,table,ul,ol,blockquote')].filter(n => !n.parentElement.closest('pre,table,ul,ol,blockquote') && n.textContent.trim()).slice(0, 30).map((n,i) => ({node:n, text:`${i + 1}. ${n.textContent.trim().replace(/\s+/g,' ').slice(0,54)}`, level:2}));
  }
  function markdownHTML(html) {
    const doc = new DOMParser().parseFromString(sanitizeHTML(html), 'text/html');
    const inline = el => [...el.childNodes].map(walk).join('');
    function walk(n) {
      if (n.nodeType === Node.TEXT_NODE) return n.textContent;
      if (n.nodeType !== Node.ELEMENT_NODE) return '';
      const tag = n.localName;
      if(n.hasAttribute('data-cr-asset'))return `\n![${(n.getAttribute('alt') || n.querySelector('title')?.textContent || '图示').replace(/[\[\]\n]/g,' ')}](${n.getAttribute('data-cr-asset')})\n\n`;
      if(n.classList.contains('cr-export-control'))return `\n${n.textContent}\n\n`;
      if(tag==='svg')return `\n${n.querySelector('title')?.textContent || ''} ${[...n.querySelectorAll('text')].map(x=>x.textContent).join(' · ')}\n\n`;
      const text = inline(n);
      if (/^h[1-6]$/.test(tag)) return `\n${'#'.repeat(Number(tag[1]))} ${text}\n\n`;
      if (tag === 'pre') { const code=n.querySelector('code'); const language=code?.className.match(/language-([\w-]+)/)?.[1] || ''; const raw=(code || n).textContent; const fence='`'.repeat(Math.max(3, ...[...raw.matchAll(/`+/g)].map(m => m[0].length + 1))); return `\n${fence}${language}\n${raw}\n${fence}\n\n`; }
      if (tag === 'code' && n.parentElement.localName !== 'pre') return `\`${text}\``;
      if (tag === 'strong' || tag === 'b') return `**${text}**`;
      if (tag === 'em' || tag === 'i') return `*${text}*`;
      if (tag === 'a') return `[${text}](${n.getAttribute('href') || ''})`;
      if (tag === 'img') return `![${n.getAttribute('alt') || ''}](${n.getAttribute('src') || ''})`;
      if (tag === 'blockquote') return `\n${text.trim().split('\n').map(t => '> '+t).join('\n')}\n\n`;
      if (tag === 'li') { const ordered=n.parentElement.localName === 'ol'; const i=[...n.parentElement.children].indexOf(n)+Number(n.parentElement.getAttribute('start') || 1); return `${ordered ? i+'.' : '-'} ${text.trim()}\n`; }
      if (tag === 'table') { const rows=[...n.querySelectorAll('tr')].map(r => [...r.children].map(c => c.textContent.replace(/\|/g,'\\|').replace(/\s+/g,' ').trim())); if (!rows.length) return ''; return '\n| '+rows[0].join(' | ')+' |\n| '+rows[0].map(()=>'---').join(' | ')+' |\n'+rows.slice(1).map(r=>'| '+r.join(' | ')+' |').join('\n')+'\n\n'; }
      if (tag === 'math') {const clean=n.cloneNode(true);for(const el of [clean,...clean.querySelectorAll('*')])el.removeAttribute('style');return clean.outerHTML;}
      if (['p','ul','ol','div','section','figure','figcaption','details'].includes(tag)) return '\n'+text+'\n\n';
      if (tag === 'br') return '\n';
      if (tag === 'hr') return '\n---\n';
      return text;
    }
    return inline(doc.body).replace(/\n{3,}/g,'\n\n').trim();
  }
  function markdown(node){return markdownHTML(messageBody(node).innerHTML);}
  window.ChatGPTReader = {sanitizeHTML, safeStyle, assetPath, safeUrl, messageBody, messageNodes, roleOf, assistantNodes, userNodes, closestMessage, messageId, outline, markdown, markdownHTML};
})();
