/* Freeze the rendered answer locally. No component scripts or private APIs run. */
(() => {
  'use strict';
  const R=window.ChatGPTReader;
  const uiSelector='[data-dil-message-id],[data-dil-source-message-id],[data-d-component]';
  const svgNS='http://www.w3.org/2000/svg';
  let chartSequence=0;
  const cssProperties='color background-color flex-direction flex-wrap justify-content align-items align-self gap row-gap column-gap padding-top padding-right padding-bottom padding-left border-top border-right border-bottom border-left border-radius font-size font-weight font-style font-family line-height letter-spacing text-align white-space vertical-align aspect-ratio'.split(' ');
  function backdrop(node) {
    for(let n=node;n;n=n.parentElement){const color=getComputedStyle(n).backgroundColor;if(color && color!=='transparent' && !/^rgba\([^)]*,\s*0\)$/.test(color))return color;}
    return document.documentElement.classList.contains('dark')?'#212121':'#fff';
  }
  function styleNode(source,clone,inUI,inSVG) {
    if(!inUI && !inSVG)return;
    const s=getComputedStyle(source);clone.removeAttribute('style');const target=clone.style;
    if(inSVG){
      // Native diagrams can draw shapes through CSS geometry rather than HTML
      // attributes. Freeze those values before removing the original classes.
      const geometry={rect:['x','y','rx','ry','width','height'],circle:['cx','cy','r'],ellipse:['cx','cy','rx','ry'],use:['x','y','width','height']}[source.localName] || [];
      for(const p of geometry){const value=s.getPropertyValue(p);if(/^-?\d+(?:\.\d+)?(?:px|%)?$/.test(value))clone.setAttribute(p,value);}
      const cssPath=s.getPropertyValue('d').match(/^path\(["']([\s\S]*)["']\)$/);if(cssPath)clone.setAttribute('d',cssPath[1]);
      if(s.transform && s.transform!=='none' && /^matrix\([0-9eE.,\s+-]+\)$/.test(s.transform))clone.setAttribute('transform',s.transform);
      for(const p of ['color','fill','stroke','stroke-width','opacity','font-size','font-family','font-weight']) {
        const value=s.getPropertyValue(p);
        // Resolve inherited chart colors, but leave local gradient references intact.
        if(value && !/url\s*\(/i.test(value))target.setProperty(p,value);
        else if(['fill','stroke'].includes(p)){const id=value.match(/#([\w:.-]+)["']?\)/)?.[1];if(id)clone.setAttribute(p,`url(#${id})`);}
      }
      for(const p of ['clip-path','mask','marker-start','marker-mid','marker-end']){const value=s.getPropertyValue(p),id=value.match(/#([\w:.-]+)["']?\)/)?.[1];if(id)clone.setAttribute(p,`url(#${id})`);}
      for(const p of ['text-anchor','dominant-baseline','fill-opacity','stroke-opacity','stroke-dasharray','stroke-dashoffset']){const value=s.getPropertyValue(p);if(value && !['none','auto','start','1','0px'].includes(value))clone.setAttribute(p,value);}
      return;
    }
    for(const p of cssProperties){const value=s.getPropertyValue(p);if(value && !['normal','none','auto','0px','rgba(0, 0, 0, 0)'].includes(value))target.setProperty(p,value);}
    if(['flex','inline-flex','grid','inline-grid'].includes(s.display)){
      target.display=s.display;
      if(s.display.includes('grid')){const columns=s.gridTemplateColumns.split(' ').filter(Boolean).length;target.gridTemplateColumns=`repeat(${Math.min(Math.max(columns,1),6)}, minmax(0, 1fr))`;}
      target.minWidth='0';
    }
    // Reflow into the PDF page rather than copying viewport-sized dimensions.
    target.maxWidth='100%';
    if(s.flexGrow!=='0')target.flexGrow=s.flexGrow;
    if(s.flexShrink!=='1')target.flexShrink=s.flexShrink;
    if(s.flexBasis.endsWith('%'))target.flexBasis=s.flexBasis;
    if(s.aspectRatio!=='auto')target.width='100%';
  }
  R.exportMessage=function(node,{format='pdf',assets=[],warnings=[]}={}) {
    const warn=message=>{if(!warnings.includes(message))warnings.push(message);};
    const asset=(element,type,content)=>{
      if(format!=='markdown')return;
      if(content.length>1800000)throw new Error('图示过大，请缩小导出范围后重试');
      const name=`assets/chart-${String(assets.length+1).padStart(3,'0')}.${type}`;
      element.setAttribute('data-cr-asset',name);assets.push({name,type,content});
    };
    const notice=message=>{warn(message);const p=document.createElement('p');p.className='cr-export-notice';p.textContent=message;return p;};
    function clone(source,inUI=false,inSVG=false) {
      if(source.nodeType===Node.TEXT_NODE)return source.cloneNode();
      if(source.nodeType!==Node.ELEMENT_NODE)return null;
      const tag=source.localName.toLowerCase();
      if(source.matches('script,style,object,embed,.katex-html,[data-cr-owned]') || source.hidden)return null;
      if(getComputedStyle(source).display==='none')return null;
      inUI ||= source.matches(uiSelector);
      inSVG=source.namespaceURI===svgNS;
      if(tag==='label' && source.htmlFor && source.control && !['password','hidden','file'].includes(source.control.type))return null;
      if(tag==='iframe')return notice('嵌入内容无法读取，请在原对话中查看。');
      if(['video','audio'].includes(tag))return notice('音视频未包含在静态导出中，请在原对话中播放。');
      if(tag==='canvas') {
        try {
          if(!source.width || !source.height)return notice('空白画布未包含在导出中。');
          const ratio=Math.min(1,1600/Math.max(source.width,source.height)),canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(source.width*ratio));canvas.height=Math.max(1,Math.round(source.height*ratio));
          canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
          const data=canvas.toDataURL('image/png'),img=document.createElement('img');
          img.src=data;img.alt=source.getAttribute('aria-label') || '交互图表（导出时状态）';img.dataset.crMedia='figure';R.sizeMedia(img,source);
          asset(img,'png',data.split(',')[1]);return img;
        }catch{return notice('此画布受跨域限制，无法导出，请在原对话中查看。');}
      }
      if(['input','textarea','select','button'].includes(tag) || source.getAttribute('role')==='slider') {
        if(!inUI || ['password','hidden','file'].includes(source.type))return null;
        const el=document.createElement('span');el.className='cr-export-control';
        let label=source.getAttribute('aria-label') || (source.id?[...document.querySelectorAll('label[for]')].find(n=>n.htmlFor===source.id)?.textContent:'') || '';
        const value=tag==='select'?[...source.selectedOptions].map(n=>n.textContent).join('、'):tag==='button'?source.textContent.trim():['checkbox','radio'].includes(source.type)?(source.checked?'已选中':'未选中'):source.getAttribute('aria-valuetext') || source.value || source.getAttribute('aria-valuenow') || '';
        el.textContent=label && label.trim()!==value?`${label.trim()}：${value}`:value;
        if(source.getAttribute('aria-pressed')==='true')el.textContent+='（已选中）';
        return el;
      }
      if(tag==='img' && source.src.startsWith('blob:')) {
        try{const canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;canvas.getContext('2d').drawImage(source,0,0);const el=document.createElement('img');el.src=canvas.toDataURL('image/png');el.alt=source.alt;R.sizeMedia(el,source);asset(el,'png',el.src.split(',')[1]);return el;}catch{return notice('此临时图片无法读取，请在原对话中查看。');}
      }
      const el=source.cloneNode(false);
      styleNode(source,el,inUI,inSVG);
      if(source.matches('[data-dil-message-id]')){
        el.className='cr-export-ui';el.dataset.crUi='true';el.style.backgroundColor=backdrop(source);el.style.color=getComputedStyle(source).color;el.style.padding='16px';el.style.borderRadius='12px';el.style.maxWidth='100%';
      }
      if(tag==='details')el.open=true;
      const children=source.shadowRoot?[...source.shadowRoot.childNodes]:[...source.childNodes];
      for(const child of children){if(tag==='details' && !source.open && child.nodeType===1 && child.localName!=='summary')continue;const copy=clone(child,inUI || tag==='foreignobject',inSVG);if(copy)el.append(copy);}
      if(tag==='img')R.sizeMedia(el,source);
      if(tag==='svg' && !source.parentElement.closest('svg')) {
        const rect=source.getBoundingClientRect();
        if(!el.hasAttribute('viewBox') && rect.width && rect.height){const numeric=(name,fallback)=>/^\d+(?:\.\d+)?$/.test(source.getAttribute(name) || '')?Number(source.getAttribute(name)):fallback;el.setAttribute('viewBox',`0 0 ${numeric('width',rect.width)} ${numeric('height',rect.height)}`);}
        el.setAttribute('xmlns',svgNS);
        // Inline definitions must not collide when several answers are combined.
        const prefix=++chartSequence,ids=new Map([...el.querySelectorAll('[id]')].map((n,i)=>[n.id,`crchart-${prefix}-${i}`]));
        for(const n of [el,...el.querySelectorAll('*')])for(const a of [...n.attributes]){
          if(a.name==='id' && ids.has(a.value))n.id=ids.get(a.value);
          else if(['href','xlink:href'].includes(a.name) && ids.has(a.value.slice(1)))n.setAttribute(a.name,'#'+ids.get(a.value.slice(1)));
          else if(/url\s*\(/i.test(a.value))n.setAttribute(a.name,a.value.replace(/url\(["']?(?:[^)"']*#)?([\w:.-]+)["']?\)/g,(all,id)=>ids.has(id)?`url(#${ids.get(id)})`:all));
        }
        const kind=R.sizeMedia(el,source);if(kind!=='icon')el.style.backgroundColor=backdrop(source);
        const safe=R.sanitizeHTML(el.outerHTML);
        const safeNode=new DOMParser().parseFromString(safe,'text/html').body.firstElementChild;
        if(kind!=='icon'){const svg=new XMLSerializer().serializeToString(safeNode);asset(safeNode,'svg',svg);}
        return safeNode;
      }
      return el;
    }
    const result=clone(R.messageBody(node));if(result)R.fitMedia(result);const html=R.sanitizeHTML(result?.outerHTML || '');
    return {role:R.roleOf(node)==='user'?'你':'ChatGPT',html,text:format==='markdown'?R.markdownHTML(html):''};
  };
})();
