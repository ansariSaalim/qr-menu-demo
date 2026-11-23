// Minimal htm-compatible tagged template (test harness only)
(function(){
  const VAL = {};
  function build(h, strings, values){
    const toks = [];
    strings.forEach((str,i)=>{ for(const ch of str) toks.push(ch); if(i<values.length) toks.push({v:values[i]}); });
    let p = 0;
    const peek = (o=0)=>toks[p+o], isV = t=>t && typeof t==='object';
    const ws = ()=>{ while(typeof peek()==='string' && /\s/.test(peek())) p++; };
    function readName(){ let n=''; while(typeof peek()==='string' && /[^\s\/>=]/.test(peek())) n+=toks[p++]; return n; }
    function cleanText(t){ if(/\n/.test(t)){ t=t.replace(/^\s*\n\s*|\s*\n\s*$/g,''); } return t; }
    function parseChildren(closing){
      const kids=[]; let text='';
      const flush=()=>{ const t=cleanText(text); if(t!=='' && !(/^\s*$/.test(t) && /\n/.test(text))) kids.push(t); text=''; };
      while(p<toks.length){
        const t=peek();
        if(isV(t)){ flush(); kids.push(t.v); p++; continue; }
        if(t==='<'){
          if(peek(1)==='/'){ flush(); p+=2; while(p<toks.length && peek()!=='>') p++; p++; return kids; }
          if(peek(1)==='!' && peek(2)==='-' && peek(3)==='-'){ flush(); p+=4; while(p<toks.length && !(peek()==='-'&&peek(1)==='-'&&peek(2)==='>')) p++; p+=3; continue; }
          flush(); kids.push(parseEl()); continue;
        }
        text+=t; p++;
      }
      flush(); return kids;
    }
    function parseEl(){
      p++; // <
      let type; if(isV(peek())){ type=toks[p++].v; } else type=readName();
      const props={}; let hasProps=false;
      for(;;){
        ws(); const t=peek();
        if(t==='/' && peek(1)==='>'){ p+=2; return h(type, hasProps?props:null); }
        if(t==='>'){ p++; break; }
        if(t==='.' && peek(1)==='.' && peek(2)==='.'){ p+=3; Object.assign(props, toks[p++].v); hasProps=true; continue; }
        const name=readName(); hasProps=true;
        if(peek()==='='){ p++;
          const q=peek();
          if(isV(q)){ props[name]=toks[p++].v; }
          else if(q==='"'||q==="'"){ p++; const parts=[]; let buf=''; while(peek()!==q){ const c=toks[p++]; if(isV(c)){ if(buf) parts.push(buf); buf=''; parts.push(c.v);} else buf+=c; } p++; if(buf||!parts.length) parts.push(buf); props[name]= parts.length===1?parts[0]:parts.join(''); }
          else { let b=''; while(typeof peek()==='string' && /[^\s>]/.test(peek()) && !(peek()==='/'&&peek(1)==='>')) b+=toks[p++]; props[name]=b; }
        } else props[name]=true;
      }
      const kids=parseChildren(true);
      return h(type, hasProps?props:null, ...kids);
    }
    const out=parseChildren(false).filter(x=>!(typeof x==='string' && /^\s*$/.test(x)));
    return out.length===1?out[0]:out;
  }
  const cache=new Map();
  window.htm={ bind(h){ return function(strings,...values){ return build(h,strings,values); }; } };
})();
