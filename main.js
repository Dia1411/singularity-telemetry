/* Singularity://Telemetry v7 — main page: hero terrain only (fullscreen-safe labels). */
(async function(){
  const D = await (await fetch('data.json?v=' + Date.now())).json();
  document.getElementById('stamp').textContent = D.meta.updatedAt;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = matchMedia('(max-width: 820px)').matches;
  const lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  const hk=D.meta.headline;
  document.getElementById('ticker').innerHTML=[[hk.doublingRecent,hk.doublingRecentLabel],[hk.frontierHorizon,hk.frontierHorizonLabel],[hk.computeGrowth,hk.computeGrowthLabel],[hk.costHalving,hk.costHalvingLabel],[hk.breakpoint,hk.breakpointLabel]]
    .map(([b,s])=>`<div role="listitem"><b>${b}</b><span>${s}</span></div>`).join('');
  document.getElementById('sources').textContent='Sources: '+D.meta.sources.join(' · ')+' — '+(D.meta.notes||[]).join(' ')+` data.json updated ${D.meta.updatedAt}.`;

  const hero=document.getElementById('hero');
  const canvas=document.getElementById('gl-hero');
  const cw=()=>canvas.clientWidth||innerWidth, ch=()=>canvas.clientHeight||600;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x000000);
  scene.fog=new THREE.FogExp2(0x000000,0.008);
  const camera=new THREE.PerspectiveCamera(isMobile?56:44,cw()/ch(),.1,600);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:!isMobile});
  renderer.setPixelRatio(Math.min(devicePixelRatio,isMobile?1.6:2));
  renderer.setSize(cw(),ch(),false);
  scene.add(new THREE.AmbientLight(0xffffff,.4));
  const lM=new THREE.PointLight(0xE85A24,1.1,220);lM.position.set(-30,50,-20);scene.add(lM);
  const lC=new THREE.PointLight(0xFF7A3D,.7,220);lC.position.set(36,30,36);scene.add(lC);

  const domains=D.domains,HUMAN=1.0,EXPERT=1.6,YS=9,SIZE=56,SEG=isMobile?96:140,BASE=.68;
  const hgt=(nx,nz)=>{let pk=0,dp=0;for(const p of domains){const dx=nx-p.x,dz=nz-p.z,g=Math.exp(-(dx*dx+dz*dz)/(2*p.s*p.s));if(p.h>=BASE)pk=Math.max(pk,(p.h-BASE)*g);else dp=Math.max(dp,(BASE-p.h)*g);}return BASE+pk-dp+.045*Math.sin(nx*9.1)*Math.cos(nz*7.3)+.03*Math.sin((nx+nz)*13.7);};
  const g=new THREE.PlaneGeometry(SIZE,SIZE,SEG,SEG);g.rotateX(-Math.PI/2);
  const pos=g.attributes.position,col=new Float32Array(pos.count*3),t=new THREE.Color();
  const cD=new THREE.Color(0x5A4038),cB=new THREE.Color(0x1A1412),cL=new THREE.Color(0x4A3028),cH=new THREE.Color(0xA04828),cT=new THREE.Color(0xE85A24),cW=new THREE.Color(0xFFB088);
  for(let i=0;i<pos.count;i++){
    const nx=pos.getX(i)/(SIZE/2),nz=pos.getZ(i)/(SIZE/2),v=hgt(nx,nz);
    pos.setY(i,v*YS);
    if(v<HUMAN)t.copy(cB).lerp(cD,Math.pow(clamp((HUMAN-v)/.9,0,1),1.4));
    else if(v<EXPERT)t.copy(cL).lerp(cH,(v-HUMAN)/(EXPERT-HUMAN));
    else t.copy(cT).lerp(cW,Math.pow(clamp((v-EXPERT)/.9,0,1),1.6));
    col[i*3]=t.r;col[i*3+1]=t.g;col[i*3+2]=t.b;
  }
  g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();
  scene.add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide})));
  const wire=new THREE.Mesh(g.clone(),new THREE.MeshBasicMaterial({vertexColors:true,wireframe:true,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false}));
  wire.position.y=.03;scene.add(wire);
  for(const[lvl,c]of[[HUMAN,0x8A8A8A],[EXPERT,0xE85A24]]){
    const gh=new THREE.GridHelper(SIZE*1.04,14,c,c);
    gh.material.transparent=true;gh.material.opacity=.28;gh.material.blending=THREE.AdditiveBlending;gh.material.depthWrite=false;
    gh.position.y=lvl*YS;scene.add(gh);
  }
  const hits=[];
  for(const p of domains){
    const h=hgt(p.x,p.z)*YS;
    const c3=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,Math.max(h,3),8),new THREE.MeshBasicMaterial({visible:false}));
    c3.position.set(p.x*SIZE/2,Math.max(h,3)/2,p.z*SIZE/2);
    c3.userData={m:p.name,val:p.note,note:p.h>=EXPERT?'above domain experts':(p.h<HUMAN?'below average human':'between human and expert')};
    scene.add(c3);hits.push(c3);
  }
  /* labels: children of #hero so they survive fullscreen */
  const labels=[];
  const labelSet=isMobile?domains.filter(p=>p.h>=1.9||p.h<=.5):domains;
  function addLabel(cls,html,x,y,z){
    const el=document.createElement('div');
    el.className='lbl '+cls;el.innerHTML=html;
    el.style.position='absolute';
    hero.appendChild(el);
    labels.push({el,v:new THREE.Vector3(x,y,z),anchorY:cls==='plane'?'-50%':'-100%'});
  }
  for(const p of labelSet)
    addLabel(p.h>=EXPERT?'peak':(p.h<HUMAN?'valley':''),p.name+'<small>'+p.note+'</small>',p.x*SIZE/2,hgt(p.x,p.z)*YS+.9,p.z*SIZE/2);
  if(!isMobile){
    addLabel('plane','human baseline = 100%',-SIZE/2-5,HUMAN*YS,0);
    addLabel('plane','domain expert',-SIZE/2-5,EXPERT*YS,0);
  }

  /* controls */
  let rot=0,pitch=0,yawV=0,pitchV=0,auto=true,panMode=false,zoom=1;
  const target=new THREE.Vector3(0,7,0);
  const slider=document.getElementById('ctl-slider'),val=document.getElementById('ctl-value');
  const autoBtn=document.getElementById('ctl-auto');autoBtn.textContent='⏸';
  function syncCtl(){const d=((rot%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
    slider.value=String(Math.round(d/(Math.PI*2)*1000));val.textContent=Math.round(d*180/Math.PI)+'°';}
  slider.addEventListener('input',()=>{rot=slider.value/1000*Math.PI*2;auto=false;autoBtn.textContent='▶';syncCtl();});
  autoBtn.addEventListener('click',()=>{auto=!auto;autoBtn.textContent=auto?'⏸':'▶';});
  document.getElementById('ctl-reset').addEventListener('click',()=>{rot=0;pitch=0;yawV=0;pitchV=0;zoom=1;target.set(0,7,0);syncCtl();});
  document.getElementById('ctl-full').addEventListener('click',()=>{
    if(document.fullscreenElement)document.exitFullscreen?.();
    else hero.requestFullscreen?.();
  });
  const panBtn=document.getElementById('ctl-pan');
  panBtn.addEventListener('click',()=>{panMode=!panMode;panBtn.style.borderColor=panMode?'#E85A24':'';panBtn.style.color=panMode?'#E85A24':'';});
  const setZoom=f=>{zoom=clamp(zoom*f,.45,2.4);};
  document.getElementById('ctl-zin').addEventListener('click',()=>setZoom(.85));
  document.getElementById('ctl-zout').addEventListener('click',()=>setZoom(1.18));
  canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(e.deltaY>0?1.07:.93);},{passive:false});
  let pinch0=0;
  canvas.addEventListener('touchstart',e=>{if(e.touches.length===2)pinch0=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);},{passive:true});
  canvas.addEventListener('touchmove',e=>{if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);setZoom(pinch0/d);pinch0=d;}},{passive:true});

  let dragging=false,px=0,py=0,moved=0,downT=0;
  canvas.addEventListener('pointerdown',e=>{dragging=true;moved=0;px=e.clientX;py=e.clientY;downT=performance.now();});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;
    const dx=e.clientX-px,dy=e.clientY-py;moved+=Math.abs(dx)+Math.abs(dy);
    if(panMode){
      const k=.06*zoom;
      const right=new THREE.Vector3(Math.cos(rot-.55),0,-Math.sin(rot-.55));
      target.addScaledVector(right,-dx*k);
      target.y=clamp(target.y+dy*k*.7,0,22);
      target.x=clamp(target.x,-30,30);target.z=clamp(target.z,-30,30);
    } else { yawV+=dx*.00030;pitchV+=dy*.00020; }
    px=e.clientX;py=e.clientY;});
  canvas.addEventListener('pointerup',e=>{
    if(dragging&&moved<8&&performance.now()-downT<400)pick(e.clientX,e.clientY);
    dragging=false;});

  const pin=document.getElementById('pin');
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let pinT=0;
  function pick(x,y){
    const r=canvas.getBoundingClientRect();
    ndc.set(((x-r.left)/r.width)*2-1,-((y-r.top)/r.height)*2+1);
    ray.setFromCamera(ndc,camera);
    const hit=ray.intersectObjects(hits,false)[0];
    if(hit){
      const u=hit.object.userData;
      document.getElementById('pin-name').textContent=u.m;
      document.getElementById('pin-val').textContent=u.val;
      document.getElementById('pin-note').textContent=u.note;
      pin.style.position='absolute';
      pin.style.left=(x-r.left)+'px';pin.style.top=(y-r.top)+'px';
      pin.hidden=false;pinT=performance.now();
    } else pin.hidden=true;
  }

  const proj=new THREE.Vector3();
  (function tick(ts){
    requestAnimationFrame(tick);
    if(auto&&!dragging){rot+=.0022;syncCtl();}
    rot+=yawV;yawV*=.9;pitch=clamp(pitch+pitchV,-.3,.35);pitchV*=.9;
    const ph=clamp(1.03+pitch,.4,1.4),r=(isMobile?100:84)*zoom;
    camera.position.set(target.x+r*Math.sin(ph)*Math.sin(rot-.55),target.y+r*Math.cos(ph),target.z+r*Math.sin(ph)*Math.cos(rot-.55));
    camera.lookAt(target);
    wire.material.opacity=reduced?.45:.4+.14*Math.sin(ts*.0016);
    if(!pin.hidden&&performance.now()-pinT>3500)pin.hidden=true;
    renderer.render(scene,camera);
    const rect=canvas.getBoundingClientRect();
    const inView=rect.bottom>0&&rect.top<innerHeight;
    const cp=camera.position;
    for(const l of labels){
      if(!inView){l.el.style.display='none';continue;}
      proj.copy(l.v).project(camera);
      if(proj.z>1){l.el.style.display='none';continue;}
      /* depth cue: nearer labels grow + brighten, far ones recede behind them */
      const ddx=cp.x-l.v.x,ddy=cp.y-l.v.y,ddz=cp.z-l.v.z,dist=Math.sqrt(ddx*ddx+ddy*ddy+ddz*ddz);
      const s=clamp(r/dist,.6,1.12);
      l.el.style.display='block';
      l.el.style.left=((proj.x*.5+.5)*rect.width)+'px';
      l.el.style.top=((-proj.y*.5+.5)*rect.height)+'px';
      l.el.style.transform=`translate(-50%,${l.anchorY}) scale(${s.toFixed(3)})`;
      l.el.style.opacity=clamp(s*1.4-.5,.4,1).toFixed(2);
      l.el.style.zIndex=String(Math.round(clamp(9-dist/24,1,8)));
    }
  })(0);
  addEventListener('resize',()=>{camera.aspect=cw()/ch();camera.updateProjectionMatrix();renderer.setSize(cw(),ch(),false);});
})();
