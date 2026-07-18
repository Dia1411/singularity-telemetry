/* Singularity://Telemetry — one stage for the frontier and three trend instruments. */
(async function(){
  const D = await (await fetch('data.json?v=' + Date.now())).json();
  document.getElementById('stamp').textContent = D.meta.updatedAt;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileMQ=matchMedia('(max-width: 820px), (max-width: 960px) and (max-height: 620px)');
  let isMobile=mobileMQ.matches;
  const lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  const CY='#E85A24', MG='#FF7A3D', GN='#E07040', VI='#C45A2A', DIM='#8A8A8A', GRID='rgba(160,160,160,.22)';
  const humanTime=s=>s<60?Math.round(s)+' s':s<3600?Math.round(s/60)+' min':(s/3600).toFixed(1)+' h';
  const hPts=D.horizon.map(d=>({x:d.date,y:d.seconds,m:d.model,note:d.note,fl:!!d.flagged}));
  const cPts=D.compute.map(d=>({x:d.date,y:d.flop,m:d.model}));
  const pPts=D.price.map(p=>({x:p.date,y:p.usd}));
  const tr=D.horizonTrends, cMaxLin=Math.max(...D.compute.map(d=>d.flop))/1e25;
  const BR=2024.27;
  const trS=t=>t<BR?tr.slow.anchorSeconds*Math.pow(2,(t-tr.slow.anchorDate)*12/tr.slow.doublingMonths)
    :(tr.slow.anchorSeconds*Math.pow(2,(BR-tr.slow.anchorDate)*12/tr.slow.doublingMonths))*Math.pow(2,(t-BR)*12/tr.fast.doublingMonths);

  /* ---------- overlay charts (unchanged pair views) ---------- */
  Chart.defaults.font.family='ui-monospace, SF Mono, Menlo, Consolas, monospace';
  Chart.defaults.color=DIM; Chart.defaults.borderColor=GRID;
  const yearTick=v=>Number.isInteger(v)?"'"+String(v).slice(2):'';
  const mkTrend=(t0,s0,dm,from,to,step=.1)=>{const p=[];for(let t=from;t<=to+1e-9;t+=step)p.push({x:t,y:s0*Math.pow(2,(t-t0)*12/dm)});return p;};
  function chartSpec(id,mode){
    const common={responsive:true,maintainAspectRatio:false,animation:!reduced,plugins:{legend:{display:false}}};
    if(id==='horizon'){
      if(mode==='log')return{type:'scatter',data:{datasets:[
        {data:hPts,pointRadius:4.5,pointHoverRadius:7,backgroundColor:hPts.map(p=>p.fl?VI:CY),borderColor:hPts.map(p=>p.fl?VI:CY)},
        {data:mkTrend(tr.slow.anchorDate,tr.slow.anchorSeconds,tr.slow.doublingMonths,tr.slow.from,tr.slow.to),type:'line',borderColor:DIM,borderDash:[5,5],borderWidth:1.2,pointRadius:0},
        {data:mkTrend(tr.fast.anchorDate,tr.fast.anchorSeconds,tr.fast.doublingMonths,tr.fast.from,tr.fast.to),type:'line',borderColor:MG,borderWidth:1.8,pointRadius:0}]},
        options:{...common,scales:{x:{type:'linear',min:2018.8,max:2026.8,ticks:{stepSize:1,callback:yearTick},grid:{color:GRID}},
          y:{type:'logarithmic',min:1,max:300000,grid:{color:GRID},ticks:{callback:v=>({1:'1 s',10:'10 s',60:'1 min',600:'10 min',3600:'1 h',28800:'8 h',57600:'16 h'})[v]??null}}},
          plugins:{...common.plugins,tooltip:{callbacks:{label:c=>c.raw.m?c.raw.m+' — '+humanTime(c.raw.y)+(c.raw.note?' ('+c.raw.note+')':''):humanTime(c.raw.y)}}}}};
      return{type:'line',data:{datasets:[{data:hPts.map(p=>({x:p.x,y:p.y/3600,m:p.m,note:p.note})),borderColor:MG,backgroundColor:MG,borderWidth:2.2,pointRadius:3.2,tension:.25,fill:{target:'origin',above:'rgba(232,90,36,.1)'}}]},
        options:{...common,scales:{x:{type:'linear',min:2018.8,max:2026.8,ticks:{stepSize:1,callback:yearTick},grid:{color:GRID}},
          y:{min:0,grid:{color:GRID},ticks:{callback:v=>v+' h'}}},
          plugins:{...common.plugins,tooltip:{callbacks:{label:c=>c.raw.m+' — '+c.parsed.y.toFixed(2)+' h'+(c.raw.note?' ('+c.raw.note+')':'')}}}}};
    }
    if(id==='compute'){
      if(mode==='log')return{type:'scatter',data:{datasets:[
        {data:cPts,backgroundColor:CY,pointRadius:4.5,pointHoverRadius:7},
        {data:mkTrend(D.compute[0].date,D.compute[0].flop,12*Math.log(2)/Math.log(4.5),D.compute[0].date-.5,2025.7,.25),type:'line',borderColor:DIM,borderDash:[5,5],borderWidth:1.2,pointRadius:0}]},
        options:{...common,scales:{x:{type:'linear',min:2011.5,max:2026.2,ticks:{stepSize:2,callback:yearTick},grid:{color:GRID}},
          y:{type:'logarithmic',min:1e17,max:1e27,grid:{color:GRID},ticks:{callback:v=>{const e=Math.log10(v);return Number.isInteger(e)&&e%2===1?'1e'+e:null}}}},
          plugins:{...common.plugins,tooltip:{callbacks:{label:c=>c.raw.m?c.raw.m+' — '+c.raw.y.toExponential(1)+' FLOP':''}}}}};
      return{type:'line',data:{datasets:[{data:cPts.map(p=>({x:p.x,y:p.y/1e25,m:p.m})),borderColor:CY,backgroundColor:CY,borderWidth:2.2,pointRadius:3.2,tension:.25,fill:{target:'origin',above:'rgba(232,90,36,.08)'}}]},
        options:{...common,scales:{x:{type:'linear',min:2011.5,max:2026.2,ticks:{stepSize:2,callback:yearTick},grid:{color:GRID}},
          y:{min:0,max:Math.ceil(cMaxLin*1.05),grid:{color:GRID},ticks:{callback:v=>v+'e25'}}},
          plugins:{...common.plugins,tooltip:{callbacks:{label:c=>c.raw.m+' — '+c.parsed.y.toFixed(3)+' ×10²⁵ FLOP'}}}}};
    }
    const span={min:D.price[0].date-.4,max:D.price[D.price.length-1].date+.5};
    if(mode==='log')return{type:'line',data:{datasets:[{data:pPts,borderColor:GN,backgroundColor:GN,borderWidth:2,pointRadius:3.2,tension:.25}]},
      options:{...common,scales:{x:{type:'linear',...span,ticks:{stepSize:1,callback:yearTick},grid:{color:GRID}},
        y:{type:'logarithmic',min:.01,max:100,grid:{color:GRID},ticks:{callback:v=>[0.01,0.1,1,10,100].includes(v)?'$'+v:null}}},
        plugins:{...common.plugins,tooltip:{callbacks:{label:c=>'≈$'+c.parsed.y+' /M tokens'}}}}};
    return{type:'line',data:{datasets:[{data:pPts,borderColor:GN,backgroundColor:GN,borderWidth:2.2,pointRadius:3.2,tension:.25,fill:{target:'origin',above:'rgba(232,90,36,.08)'}}]},
      options:{...common,scales:{x:{type:'linear',...span,ticks:{stepSize:1,callback:yearTick},grid:{color:GRID}},
        y:{min:0,grid:{color:GRID},ticks:{callback:v=>'$'+v}}},
        plugins:{...common.plugins,tooltip:{callbacks:{label:c=>'≈$'+c.parsed.y+' /M tokens'}}}}};
  }
  const PAIRS={
    horizon:{no:'PAIR I',title:'Task Horizon',moral:'Six of seven years round to zero on the linear axis. The flagged point is Claude Mythos Preview — 16+ hours, above METR\u2019s measurement ceiling. Post-2024 doubling: every ~3.5 months.',src:'METR Time Horizon tracker (post Mar-26 correction).'},
    compute:{no:'PAIR II',title:'Training Compute',moral:'Nine orders of magnitude in thirteen years. On the honest axis every model before 2023 is the same dot on the floor.',src:'Epoch AI notable-models database · ~4.5× per year.'},
    price:{no:'PAIR III',title:'Cost of Fixed Capability',moral:'A 1,000× collapse isn\u2019t a decline — it\u2019s a cliff followed by years of zero.',src:'Epoch AI price trends · a16z LLMflation · halving ≈ every 2 months.'}};
  const overlay=document.getElementById('overlay'); let ovCharts=[],lastFocus=null;
  function openOverlay(id){
    const m=PAIRS[id];
    lastFocus=document.activeElement;
    document.getElementById('ov-no').textContent=m.no;
    document.getElementById('ov-title').textContent=m.title;
    document.getElementById('ov-moral').textContent=m.moral;
    document.getElementById('ov-src').textContent=m.src;
    overlay.hidden=false;
    document.body.classList.add('ov-open');
    document.getElementById('stage').setAttribute?.('aria-hidden','true');
    document.getElementById('stage').inert=true;
    ovCharts.forEach(c=>c.destroy());ovCharts=[];
    requestAnimationFrame(()=>{
      ovCharts.push(new Chart(document.getElementById('ov-log'),chartSpec(id,'log')));
      ovCharts.push(new Chart(document.getElementById('ov-lin'),chartSpec(id,'lin')));
      document.getElementById('ov-close').focus?.();
    });
  }
  function closeOverlay(){
    overlay.hidden=true;document.body.classList.remove('ov-open');
    document.getElementById('stage').removeAttribute?.('aria-hidden');
    document.getElementById('stage').inert=false;
    ovCharts.forEach(c=>c.destroy());ovCharts=[];lastFocus?.focus?.();
  }
  document.getElementById('ov-close').addEventListener('click',closeOverlay);
  document.getElementById('overlay-backdrop').addEventListener('click',closeOverlay);
  addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!overlay.hidden)closeOverlay();
    if(e.key==='Tab'&&!overlay.hidden){e.preventDefault();document.getElementById('ov-close').focus?.();}
  });

  const glow=(c,o)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false});

  /* ============ one stage, four switchable terrain views ============ */
  const stageEl=document.getElementById('stage');
  const canvas=document.getElementById('gi-stage');
  const cw=()=>canvas.clientWidth||innerWidth, ch=()=>canvas.clientHeight||600;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x000000);
  scene.fog=new THREE.FogExp2(0x000000,0.008);
  const camera=new THREE.PerspectiveCamera(isMobile?56:44,cw()/ch(),.1,600);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:!isMobile});
  renderer.setPixelRatio(Math.min(devicePixelRatio,isMobile?1.35:2));
  renderer.setSize(cw(),ch(),false);
  scene.add(new THREE.AmbientLight(0xffffff,.4));
  const lM=new THREE.PointLight(0xE85A24,1.1,220);lM.position.set(-30,50,-20);scene.add(lM);
  const lC=new THREE.PointLight(0xFF7A3D,.7,220);lC.position.set(36,30,36);scene.add(lC);

  const allLabels=[]; /* {el,v,inst,priority} */
  function addLabel(inst,cls,html,x,y,z,prio){
    const el=document.createElement('div');
    el.className='lbl '+cls;el.innerHTML=html;el.style.position='absolute';
    stageEl.appendChild(el);
    const isPlane=/\bplane\b/.test(cls);
    const priority=prio??(cls.includes('peak')?4:cls.includes('valley')?3:isPlane?1:2);
    allLabels.push({el,v:new THREE.Vector3(x,y,z),inst,priority,anchorY:isPlane?'-50%':'-100%'});
  }

  /* Prefer milestones / isolated peaks when screen-space labels collide. */
  function bumpLabelPriority(entries,i,fl){
    if(fl)return 5;
    const e=entries[i], name=e.m||'';
    /* Keep open-weight / xAI / GLM names visible — they sit low on the linear axis. */
    if(/^(GLM|Grok|DeepSeek|Kimi|Qwen|gpt-oss)/i.test(name))return 4;
    if(i===0||i===entries.length-1)return 4;
    const t=e.t,h=e.h;
    const gapL=i>0?t-entries[i-1].t:9,gapR=i<entries.length-1?entries[i+1].t-t:9;
    if(Math.min(gapL,gapR)>=.45)return 4;
    const peak=(i===0||h>=entries[i-1].h-.02)&&(i===entries.length-1||h>=entries[i+1].h-.02);
    if(peak)return 3;
    return 2;
  }

  function buildFrontier(){
    const inst='frontier',G=new THREE.Group();G.visible=false;scene.add(G);
    const domains=D.domains,HUMAN=1,EXPERT=1.6,YS=9,SIZE=56,SEG=isMobile?96:140,BASE=.68;
    const hgt=(nx,nz)=>{
      let pk=0,dp=0;
      for(const p of domains){
        const dx=nx-p.x,dz=nz-p.z,g=Math.exp(-(dx*dx+dz*dz)/(2*p.s*p.s));
        if(p.h>=BASE)pk=Math.max(pk,(p.h-BASE)*g);
        else dp=Math.max(dp,(BASE-p.h)*g);
      }
      return BASE+pk-dp+.045*Math.sin(nx*9.1)*Math.cos(nz*7.3)+.03*Math.sin((nx+nz)*13.7);
    };
    const g=new THREE.PlaneGeometry(SIZE,SIZE,SEG,SEG);g.rotateX(-Math.PI/2);
    const pos=g.attributes.position,col=new Float32Array(pos.count*3),tc=new THREE.Color();
    const cD=new THREE.Color(0x5A4038),cB=new THREE.Color(0x1A1412),cL=new THREE.Color(0x4A3028),
          cH=new THREE.Color(0xA04828),cT=new THREE.Color(0xE85A24),cW=new THREE.Color(0xFFB088);
    for(let i=0;i<pos.count;i++){
      const nx=pos.getX(i)/(SIZE/2),nz=pos.getZ(i)/(SIZE/2),v=hgt(nx,nz);
      pos.setY(i,v*YS);
      if(v<HUMAN)tc.copy(cB).lerp(cD,Math.pow(clamp((HUMAN-v)/.9,0,1),1.4));
      else if(v<EXPERT)tc.copy(cL).lerp(cH,(v-HUMAN)/(EXPERT-HUMAN));
      else tc.copy(cT).lerp(cW,Math.pow(clamp((v-EXPERT)/.9,0,1),1.6));
      col[i*3]=tc.r;col[i*3+1]=tc.g;col[i*3+2]=tc.b;
    }
    g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();
    G.add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide})));
    const wire=new THREE.Mesh(g.clone(),new THREE.MeshBasicMaterial({vertexColors:true,wireframe:true,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false}));
    wire.position.y=.03;G.add(wire);
    for(const[lvl,color]of[[HUMAN,0x8A8A8A],[EXPERT,0xE85A24]]){
      const gh=new THREE.GridHelper(SIZE*1.04,14,color,color);
      gh.material.transparent=true;gh.material.opacity=.28;gh.material.blending=THREE.AdditiveBlending;gh.material.depthWrite=false;
      gh.position.y=lvl*YS;G.add(gh);
    }
    /* Fan labels by angle + stack height so desktop "show all" doesn't clobber. */
    const labeled=[...domains].sort((a,b)=>Math.atan2(a.z,a.x)-Math.atan2(b.z,b.x));
    labeled.forEach((p,i)=>{
      const stack=i%5;
      const yOff=1.15+stack*2.35+(p.h>=EXPERT?.8:0);
      const ang=Math.atan2(p.z,p.x), outward=.55+stack*.35;
      const lx=p.x*SIZE/2+Math.cos(ang)*outward;
      const lz=p.z*SIZE/2+Math.sin(ang)*outward;
      addLabel(inst,p.h>=EXPERT?'peak':(p.h<HUMAN?'valley':''),p.name+'<small>'+p.note+'</small>',lx,hgt(p.x,p.z)*YS+yOff,lz);
    });
    addLabel(inst,'plane axis','human baseline = 100%',-SIZE/2-6.5,HUMAN*YS,SIZE*.22,3);
    addLabel(inst,'plane axis','domain expert',-SIZE/2-6.5,EXPERT*YS,-SIZE*.22,3);
    return {group:G,wire,camR:84,targetY:7};
  }

  /* terrain builder → returns {group, wire} added hidden */
  function buildTerrain(inst,cfg){
    const G=new THREE.Group();G.visible=false;scene.add(G);
    const HW=27, HD=13, SEGX=isMobile?100:150, SEGZ=isMobile?44:64, HMAX=15;
    const [T0,T1]=cfg.tRange;
    const mapX=t=>lerp(-HW,HW,(t-T0)/(T1-T0));
    const N=cfg.entries.length;
    const lane=i=>lerp(-HD+2,HD-2,N===1?.5:i/(N-1));
    const bumps=cfg.entries.map((e,i)=>({x:mapX(e.t),z:lane(i),h:e.h*HMAX,fl:!!e.fl,e}));
    const field=(x,z)=>{
      let v=0;
      for(const b of bumps){
        const dx=(x-b.x)/4.0,dz=(z-b.z)/3.0;
        v=Math.max(v,b.h*Math.exp(-(dx*dx+dz*dz)));
      }
      if(cfg.trendH){
        const t=T0+((x+HW)/(2*HW))*(T1-T0);
        v=Math.max(v,cfg.trendH(t)*HMAX*.3);
      }
      v+= .12*Math.sin(x*1.3)*Math.cos(z*1.1);
      return Math.max(v,.05);
    };
    const g=new THREE.PlaneGeometry(HW*2,HD*2,SEGX,SEGZ);g.rotateX(-Math.PI/2);
    const pos=g.attributes.position,col=new Float32Array(pos.count*3),tc=new THREE.Color();
    const cLo=new THREE.Color(0x1A1412),cMd=new THREE.Color(0x3A2820),cMd2=new THREE.Color(0xA04828),
          cHi=new THREE.Color(0xE85A24),cW=new THREE.Color(0xFFB088),cVi=new THREE.Color(0xC45A2A);
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),z=pos.getZ(i),v=field(x,z);
      pos.setY(i,v);
      let nearFlag=false;
      for(const b of bumps)if(b.fl&&Math.abs(x-b.x)<3.4&&Math.abs(z-b.z)<2.8)nearFlag=true;
      const k=clamp(v/HMAX,0,1);
      if(nearFlag&&k>.55)tc.copy(cVi);
      else if(k<.25)tc.copy(cLo).lerp(cMd,k/.25);
      else if(k<.6)tc.copy(cMd).lerp(cMd2,(k-.25)/.35);
      else tc.copy(cMd2).lerp(k>.88?cW:cHi,(k-.6)/.4);
      col[i*3]=tc.r;col[i*3+1]=tc.g;col[i*3+2]=tc.b;
    }
    g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();
    G.add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide})));
    const wire=new THREE.Mesh(g.clone(),new THREE.MeshBasicMaterial({vertexColors:true,wireframe:true,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false}));
    wire.position.y=.03;G.add(wire);
    for(const pl of cfg.planes){
      const gh=new THREE.GridHelper(HW*2.08,14,pl.color,pl.color);
      gh.material.transparent=true;gh.material.opacity=.24;gh.material.blending=THREE.AdditiveBlending;gh.material.depthWrite=false;
      gh.position.y=pl.h*HMAX;gh.scale.z=HD/HW;G.add(gh);
      if(pl.label)addLabel(inst,'plane',pl.label,-HW-4,pl.h*HMAX,0);
    }
    if(cfg.seamT!=null){
      const sx=mapX(cfg.seamT);
      const seamY=field(sx,0)+.5;
      const seam=new THREE.Mesh(new THREE.BoxGeometry(.14,.14,HD*2+2),glow(0xE85A24,.6));
      seam.position.set(sx,seamY,0);G.add(seam);
      /* Keep near the seam on the floor — not up by the METR ceiling plane. */
      addLabel(inst,'plane','breakpoint · Apr 2024',sx,Math.min(seamY+1.8,3.2),HD*.55);
    }
    for(let y=Math.ceil(cfg.tRange[0]);y<=Math.floor(cfg.tRange[1]);y+=cfg.yearStep||1){
      const post=new THREE.Mesh(new THREE.BoxGeometry(.14,1.3,.14),glow(0xFF7A3D,.75));
      post.position.set(mapX(y),.65,HD+1.4);G.add(post);
    }
    const dense=N>=8;
    bumps.forEach((b,i)=>{
      const prio=bumpLabelPriority(cfg.entries,i,b.fl);
      /* Stagger height so close-in-time peaks don't share the same screen row. */
      const yOff=1.2+(i%3)*1.55+((i%2)?.35:0);
      const showSub=!dense||prio>=4||b.fl;
      const html=showSub?b.e.m+'<small>'+b.e.sub+'</small>':b.e.m;
      addLabel(inst,b.fl?'peak':'',html,b.x,b.h+yOff,b.z,prio);
    });
    return {group:G,wire,camR:cfg.camR,targetY:6};
  }

  /* Linear axis capped at METR's 16 h ceiling — early models sit on the floor on purpose. */
  const HCEIL=57600;
  const INSTRUMENTS={
    frontier:{
      no:'OVERVIEW',name:'The Jagged Frontier',
      desc:'AI capability by domain: expert-level peaks beside deep valleys in reliability, robotics, and physical dexterity.',
      blurb:'Height = capability vs humans. Orange grid = domain expert. Grey grid = average human (100%). Peaks beat experts; valleys lag people.',
      pair:null,built:buildFrontier()},
    horizon:{
      no:'INSTRUMENT I',name:'Task Horizon',
      desc:'time × model × how long AI works alone — linear seconds, not log. Pre-2024 is a flat floor; the seam is the Apr-2024 breakpoint; grids at 8 h and METR\u2019s 16 h ceiling.',
      blurb:'X = year · Y = how long a model can work alone (linear hours). The cliff after Apr 2024 is real — early models sit on the floor on purpose.',
      pair:'horizon',
      built:buildTerrain('horizon',{tRange:[2019,2026.7],camR:62,seamT:BR,
        entries:hPts.map(p=>({t:p.x,m:p.m,sub:humanTime(p.y),h:clamp(p.y/HCEIL,0,1.05),fl:p.fl})),
        trendH:t=>clamp(trS(t)/HCEIL,0,1.05),
        planes:[
          {h:28800/HCEIL,color:0xC45A2A,label:'8 h'},
          {h:57600/HCEIL,color:0xE85A24,label:'METR ceiling — 16 h'}
        ]})},
    compute:{
      no:'INSTRUMENT II',name:'Compute Skyline',
      desc:'time × model × training FLOP. Nine orders of magnitude, AlexNet\u2019s foothill to Grok 4\u2019s summit; Chinese open MoEs (DeepSeek, GLM, Kimi) sit far below closed compute; grids at 10²⁰/10²³/10²⁶.',
      blurb:'X = year · Y = training compute (log FLOP). Closed labs climb to 10²⁶; open Chinese MoEs use far less compute for strong capability.',
      pair:'compute',
      built:buildTerrain('compute',{tRange:[2012,2026.5],camR:62,seamT:null,yearStep:2,
        entries:cPts.map(c=>({t:c.x,m:c.m,sub:c.y.toExponential(1)+' FLOP',h:clamp((Math.log10(c.y)-16)/11,0,1)})),
        trendH:t=>clamp((Math.log10(D.compute[0].flop*Math.pow(4.5,t-D.compute[0].date))-16)/11,0,1),
        planes:[{h:(20-16)/11,color:0x8A8A8A,label:'10²⁰ FLOP'},{h:(23-16)/11,color:0xC45A2A,label:'10²³ FLOP'},{h:(26-16)/11,color:0xE85A24,label:'10²⁶ FLOP'}]})},
    price:{
      no:'INSTRUMENT III',name:'Cost Collapse',
      desc:'time × threshold × price of GPT-3-class capability. The only range that erodes: $60 → $0.06 through the $100/$1/$0.01 grids.',
      blurb:'X = year · Y = $ per million tokens for GPT-3-class capability. A ~1,000× price collapse in three years — the only terrain that shrinks.',
      pair:'price',
      built:buildTerrain('price',{tRange:[2021.6,2025.4],camR:58,seamT:null,
        entries:pPts.map(p=>({t:p.x,m:'$'+p.y+' /M tok',sub:'~'+Math.floor(p.x),h:clamp((Math.log10(p.y)+2)/4,0,1)})),
        trendH:t=>{let a=pPts[0],b=pPts[pPts.length-1];
          for(let i=0;i<pPts.length-1;i++)if(t>=pPts[i].x&&t<=pPts[i+1].x){a=pPts[i];b=pPts[i+1];break;}
          const k=clamp((t-a.x)/Math.max(b.x-a.x,.001),0,1);
          return clamp((Math.log10(Math.pow(10,lerp(Math.log10(a.y),Math.log10(b.y),k)))+2)/4,0,1);},
        planes:[{h:(Math.log10(100)+2)/4,color:0x8A8A8A,label:'$100'},{h:(Math.log10(1)+2)/4,color:0xC45A2A,label:'$1'},{h:(Math.log10(.01)+2)/4,color:0xE85A24,label:'$0.01'}]})},
  };
  const ORDER=['frontier','horizon','compute','price'];

  /* instrument cards */
  const nav=document.getElementById('inst-nav');
  ORDER.forEach(id=>{
    const m=INSTRUMENTS[id];
    const b=document.createElement('button');
    b.className='inst-card';b.dataset.id=id;
    b.innerHTML=`<span class="v-no">${m.no}</span><b>${m.name}</b><p>${m.desc}</p>`;
    b.setAttribute?.('aria-label',`${m.name}. ${m.desc}`);
    b.addEventListener('click',()=>setInstrument(id));
    nav.appendChild(b);
  });

  /* hero-identical controls */
  let rot=0,pitch=0,yawV=0,pitchV=0,auto=true,panMode=false,zoom=1;
  const target=new THREE.Vector3(0,6,0);
  const slider=document.getElementById('ctl-slider'),val=document.getElementById('ctl-value');
  const autoBtn=document.getElementById('ctl-auto');autoBtn.textContent='⏸';
  function syncAuto(){
    autoBtn.textContent=auto?'⏸':'▶';
    autoBtn.setAttribute?.('aria-pressed',String(auto));
    autoBtn.setAttribute?.('aria-label',auto?'Pause rotation':'Start rotation');
  }
  function syncCtl(){const d=((rot%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
    slider.value=String(Math.round(d/(Math.PI*2)*1000));val.textContent=Math.round(d*180/Math.PI)+'°';}
  slider.addEventListener('input',()=>{rot=slider.value/1000*Math.PI*2;auto=false;syncAuto();syncCtl();});
  autoBtn.addEventListener('click',()=>{auto=!auto;syncAuto();});
  document.getElementById('ctl-reset').addEventListener('click',()=>{rot=0;pitch=0;yawV=0;pitchV=0;zoom=1;target.set(0,INSTRUMENTS[cur].built.targetY,0);syncCtl();});
  document.getElementById('ctl-full').addEventListener('click',()=>{
    if(document.fullscreenElement)document.exitFullscreen?.();
    else stageEl.requestFullscreen?.();
  });
  const panBtn=document.getElementById('ctl-pan');
  panBtn.addEventListener('click',()=>{
    panMode=!panMode;panBtn.classList.toggle('active',panMode);
    panBtn.setAttribute?.('aria-pressed',String(panMode));
  });
  const setZoom=f=>{zoom=clamp(zoom*f,.45,2.4);};
  document.getElementById('ctl-zin').addEventListener('click',()=>setZoom(.85));
  document.getElementById('ctl-zout').addEventListener('click',()=>setZoom(1.18));
  let pinch0=0,pinching=false;
  canvas.addEventListener('touchstart',e=>{if(e.touches.length===2){pinching=true;dragging=false;pinch0=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);}},{passive:true});
  canvas.addEventListener('touchmove',e=>{if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);setZoom(pinch0/d);pinch0=d;}},{passive:true});
  canvas.addEventListener('touchend',e=>{if(e.touches.length<2)pinching=false;},{passive:true});

  let dragging=false,px=0,py=0;
  canvas.addEventListener('pointerdown',e=>{if(pinching)return;dragging=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging||pinching)return;
    const dx=e.clientX-px,dy=e.clientY-py;
    if(panMode){
      const k=.06*zoom;
      const right=new THREE.Vector3(Math.cos(rot-.5),0,-Math.sin(rot-.5));
      target.addScaledVector(right,-dx*k);
      target.y=clamp(target.y+dy*k*.7,0,20);
      target.x=clamp(target.x,-30,30);target.z=clamp(target.z,-30,30);
    } else { yawV+=dx*.00030;pitchV+=dy*.00020; }
    px=e.clientX;py=e.clientY;});
  const endDrag=()=>dragging=false;
  canvas.addEventListener('pointerup',endDrag);
  canvas.addEventListener('pointercancel',endDrag);

  let cur='frontier';
  addEventListener('keydown',e=>{
    if(!overlay.hidden)return;
    if(e.key==='ArrowDown'||e.key==='ArrowRight')setInstrument(ORDER[(ORDER.indexOf(cur)+1)%ORDER.length]);
    if(e.key==='ArrowUp'||e.key==='ArrowLeft')setInstrument(ORDER[(ORDER.indexOf(cur)+ORDER.length-1)%ORDER.length]);
  });

  /* switch transition: new terrain rises out of the floor over ~600 ms */
  let riseT0=-1;
  const RISE_MS=620, easeOut=t=>1-Math.pow(1-t,3);
  function setInstrument(id){
    const changed=cur!==id;
    cur=id;
    const m=INSTRUMENTS[id];
    ORDER.forEach(k=>INSTRUMENTS[k].built.group.visible=(k===id));
    let activeCard=null;
    document.querySelectorAll('.inst-card').forEach(b=>{
      const active=b.dataset.id===id;
      b.classList.toggle('active',active);
      if(active)b.setAttribute?.('aria-current','true');
      else b.removeAttribute?.('aria-current');
      if(active)activeCard=b;
    });
    const noEl=document.getElementById('view-no');
    const titleEl=document.getElementById('view-title');
    const blurbEl=document.getElementById('view-blurb');
    if(noEl)noEl.textContent=m.no;
    if(titleEl)titleEl.textContent=m.name;
    if(blurbEl)blurbEl.textContent=m.blurb||m.desc;
    const openBtn=document.getElementById('open-telemetry'),pair=m.pair;
    openBtn.hidden=!pair;
    openBtn.onclick=pair?()=>openOverlay(pair):null;
    document.body.classList.toggle('has-overlay-action',!!pair);
    target.set(0,m.built.targetY,0);zoom=1;
    if(changed&&!reduced)riseT0=performance.now();
    if(changed&&isMobile)activeCard?.scrollIntoView?.({behavior:reduced?'auto':'smooth',block:'nearest',inline:'center'});
    try{history.replaceState(null,'','#'+id);}catch(_){}
  }

  const proj=new THREE.Vector3();
  (function tick(ts){
    requestAnimationFrame(tick);
    if(document.hidden)return;
    if(auto&&!dragging){rot+=.0018;syncCtl();}
    rot+=yawV;yawV*=.9;pitch=clamp(pitch+pitchV,-.28,.35);pitchV*=.9;
    const m=INSTRUMENTS[cur].built;
    const compactLandscape=isMobile&&ch()<500;
    const ph=clamp(1.02+pitch,.42,1.4),r=(isMobile?(compactLandscape?m.camR*.76:m.camR+16):m.camR)*zoom;
    camera.position.set(target.x+r*Math.sin(ph)*Math.sin(rot-.5),target.y+r*Math.cos(ph),target.z+r*Math.sin(ph)*Math.cos(rot-.5));
    camera.lookAt(target);
    const rise=riseT0<0?1:easeOut(clamp((performance.now()-riseT0)/RISE_MS,0,1));
    m.group.scale.y=Math.max(rise,.001);
    m.wire.material.opacity=(reduced?.4:.36+.12*Math.sin(ts*.0016))*rise;
    if(overlay.hidden)renderer.render(scene,camera);
    const rect=canvas.getBoundingClientRect();
    const cp=camera.position;
    const projected=[];
    for(const l of allLabels){
      if(l.inst!==cur||!overlay.hidden){l.el.style.display='none';continue;}
      proj.set(l.v.x,l.v.y*rise,l.v.z).project(camera);
      if(proj.z>1||Math.abs(proj.x)>1.15||Math.abs(proj.y)>1.15){l.el.style.display='none';continue;}
      const ddx=cp.x-l.v.x,ddy=cp.y-l.v.y*rise,ddz=cp.z-l.v.z,dist=Math.sqrt(ddx*ddx+ddy*ddy+ddz*ddz);
      const s=clamp(r/dist,.6,1.12);
      projected.push({l,dist,s,x:(proj.x*.5+.5)*rect.width,y:(-proj.y*.5+.5)*rect.height});
    }
    projected.sort((a,b)=>b.l.priority-a.l.priority||a.dist-b.dist);
    const occupied=[];
    /* Frontier desktop: show every on-screen label — no collision cull. */
    const showAll=!isMobile&&cur==='frontier';
    const safeTop=isMobile?62:8;
    const safeBottom=isMobile?(compactLandscape?84:(INSTRUMENTS[cur].pair?154:104)):12;
    const pad=isMobile?5:8;
    for(const p of projected){
      const l=p.l;
      const chars=(l.el.textContent||'').length;
      const hasSub=!!l.el.querySelector?.('small');
      const w=Math.min(rect.width*(isMobile?.42:.28),Math.max(isMobile?74:88,chars*(isMobile?5.2:6.4)));
      const h=isMobile?(hasSub?34:26):(hasSub?38:22);
      const box={left:p.x-w/2,right:p.x+w/2,top:p.y-h,bottom:p.y};
      const oob=box.left<6||box.right>rect.width-6||box.top<safeTop||box.bottom>rect.height-safeBottom;
      const hit=!showAll&&occupied.some(o=>box.left<o.right+pad&&box.right>o.left-pad&&box.top<o.bottom+pad&&box.bottom>o.top-pad);
      if(oob||hit){l.el.style.display='none';continue;}
      if(!showAll)occupied.push(box);
      l.el.style.display='block';
      l.el.style.left=p.x+'px';
      l.el.style.top=p.y+'px';
      l.el.style.transform=`translate(-50%,${l.anchorY}) scale(${p.s.toFixed(3)})`;
      l.el.style.opacity=(clamp(p.s*1.4-.5,.4,1)*rise).toFixed(2);
      l.el.style.zIndex=String(Math.round(clamp(9-p.dist/24,1,8))+l.priority);
    }
  })(0);
  function resize(){
    isMobile=mobileMQ.matches;
    camera.fov=isMobile?56:44;
    camera.aspect=cw()/ch();camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio,isMobile?1.35:2));
    renderer.setSize(cw(),ch(),false);
  }
  addEventListener('resize',resize);
  mobileMQ.addEventListener?.('change',resize);

  setInstrument(ORDER.includes(location.hash.slice(1))?location.hash.slice(1):'frontier');
  syncAuto();
})();
