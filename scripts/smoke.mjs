// scripts/smoke.mjs — executes the unified app headlessly with stubbed browser APIs.
// Catches runtime errors (TDZ, undefined refs, bad calls) that `node --check` can't.
// Usage: node scripts/smoke.mjs
import { readFileSync } from "node:fs";

const allFails = [];

function makeEnv({ mobile=false }={}){
  const state = { warn:[], rendererCount:0, chartCount:0, rafCalls:0, elements:{}, listeners:{}, pixelRatio:0 };

  function el(id){
    const classes = new Set();
    const e = {
      id, style:{}, dataset:{}, children:[], hidden:false, value:"0",
      textContent:"", innerHTML:"", className:"", onclick:null, width:300, height:150,
      clientWidth:mobile?390:600, clientHeight:mobile?792:330, _parent:null, attributes:{}, inert:false,
      classList:{
        add(...xs){ xs.forEach(x=>classes.add(x)); },
        remove(...xs){ xs.forEach(x=>classes.delete(x)); },
        toggle(x,on){ if(on===undefined)on=!classes.has(x); on?classes.add(x):classes.delete(x); return on; },
        contains(x){ return classes.has(x); }
      },
      addEventListener(type,fn){ (state.listeners[id+":"+type]??=[]).push(fn); }, removeEventListener(){},
      appendChild(c){ this.children.push(c); if(c) c._parent=this; return c; },
      querySelectorAll(){ return []; }, querySelector(){ return null; },
      getContext(){ return { }; },
      closest(){ return null; }, setPointerCapture(){}, scrollIntoView(){}, focus(){ documentStub.activeElement=this; },
      setAttribute(k,v){ this.attributes[k]=String(v); }, removeAttribute(k){ delete this.attributes[k]; },
      getBoundingClientRect(){ const w=mobile?390:600,h=mobile?792:330; return {width:w,height:h,top:0,left:0,bottom:h,right:w}; },
      requestFullscreen(){},
    };
    Object.defineProperty(e,"parentElement",{ get(){ return this._parent ?? (this._parent = el(id+"-parent")); } });
    return e;
  }
  const documentStub = {
    getElementById: id => (state.elements[id] ??= el(id)),
    createElement: tag => el("dyn:"+tag),
    querySelectorAll: sel => sel===".inst-card" ? (state.elements["inst-nav"]?.children||[]) : [],
    body: el("body"),
    documentElement: Object.assign(el("html"), { scrollHeight: 5000 }),
    fullscreenElement: null,
    activeElement: null,
    hidden: false,
    addEventListener(){},
    exitFullscreen(){},
  };

  function vec3(x=0,y=0,z=0){
    const v = { x,y,z,
      set(a,b,c){ v.x=a; v.y=b; v.z=c; return v; },
      copy(o){ v.x=o.x??0; v.y=o.y??0; v.z=o.z??0; return v; },
      project(){ v.z=.5; return v; },
      addScaledVector(o,s){ v.x+=o.x*s; v.y+=o.y*s; v.z+=o.z*s; return v; },
    };
    return v;
  }
  function obj3d(kind){
    const o = {
      kind, visible:true, children:[], userData:{},
      position:vec3(), rotation:{x:0,y:0,z:0},
      scale:Object.assign(vec3(1,1,1),{set(){}}),
      material:{ opacity:1, transparent:true },
      geometry:{ attributes:{ position:{ count:9, getX:()=>0, getY:()=>0, getZ:()=>0, setY(){}, needsUpdate:false } },
        setAttribute(){}, computeVertexNormals(){}, rotateX(){ return this; }, clone(){ return this; }, translate(){} },
      add(...cs){ o.children.push(...cs); return o; },
      lookAt(){}, clone(){ return obj3d(kind); },
    };
    return o;
  }
  class BufGeo {
    constructor(){ this.attributes={position:{count:9,getX:()=>0,getY:()=>0,getZ:()=>0,setY(){},needsUpdate:false}}; }
    setAttribute(){} computeVertexNormals(){} rotateX(){ return this; } clone(){ return this; } translate(){}
  }
  const matCheck = (p, push) => { for(const[k,v]of Object.entries(p||{})) if(v===undefined) push(`Material param '${k}' is undefined`); };
  const THREE = {
    Scene: class { constructor(){ Object.assign(this, obj3d("scene")); this.background=null; this.fog=null; } },
    PerspectiveCamera: class { constructor(){ Object.assign(this, obj3d("cam")); this.aspect=1; } updateProjectionMatrix(){} },
    WebGLRenderer: class { constructor(){ state.rendererCount++; this.domElement=el("glcanvas"); } setPixelRatio(v){state.pixelRatio=v;} setSize(){} render(){} },
    Color: class { constructor(){ this.r=0;this.g=0;this.b=0; } lerp(){ return this; } copy(){ return this; } },
    Fog: class {}, FogExp2: class {},
    AmbientLight: class { constructor(){ Object.assign(this, obj3d("light")); } },
    PointLight: class { constructor(){ Object.assign(this, obj3d("light")); } },
    DirectionalLight: class { constructor(){ Object.assign(this, obj3d("light")); } },
    Group: class { constructor(){ Object.assign(this, obj3d("group")); } },
    Mesh: class { constructor(g,m){ Object.assign(this, obj3d("mesh")); if(g) this.geometry=g; if(m) this.material=m; } },
    LineSegments: class { constructor(){ Object.assign(this, obj3d("lines")); } },
    Points: class { constructor(){ Object.assign(this, obj3d("points")); } },
    GridHelper: class { constructor(){ Object.assign(this, obj3d("grid")); } },
    PlaneGeometry: BufGeo, BoxGeometry: BufGeo, SphereGeometry: BufGeo,
    CylinderGeometry: BufGeo, RingGeometry: BufGeo, TubeGeometry: BufGeo, EdgesGeometry: BufGeo,
    BufferGeometry: BufGeo,
    Shape: class { moveTo(){} lineTo(){} closePath(){} },
    ExtrudeGeometry: class extends BufGeo {},
    BufferAttribute: class { constructor(){} },
    CanvasTexture: class { constructor(){ this.anisotropy=1; } },
    MeshLambertMaterial: class { constructor(p={}){ matCheck(p, m=>state.warn.push(m)); Object.assign(this,p); this.opacity=1; } },
    MeshBasicMaterial: class { constructor(p={}){ matCheck(p, m=>state.warn.push(m)); Object.assign(this,p); this.opacity=p.opacity??1; } },
    LineBasicMaterial: class { constructor(p={}){ Object.assign(this,p); } },
    PointsMaterial: class { constructor(p={}){ Object.assign(this,p); } },
    Vector2: class { constructor(){ this.x=0;this.y=0; } set(x,y){ this.x=x;this.y=y; } },
    Vector3: class { constructor(x,y,z){ return vec3(x,y,z); } },
    CatmullRomCurve3: class { constructor(pts){ this.points=pts||[]; } },
    Raycaster: class { setFromCamera(){} intersectObjects(){ return []; } },
    MathUtils: { clamp:(v,a,b)=>Math.max(a,Math.min(b,v)) },
    AdditiveBlending: 2, DoubleSide: 2,
  };

  class ChartStub {
    constructor(canvas, spec){
      state.chartCount++;
      if(!spec || !spec.data || !Array.isArray(spec.data.datasets)) state.warn.push("Chart called without datasets");
      try {
        const scales = spec.options?.scales || {};
        for (const s of Object.values(scales)) {
          const cb = s?.ticks?.callback;
          if (cb) [0,1,10,60,600,3600,28800,57600,2020,2024,0.01,0.1,1,10,100,1e21,1e25].forEach(v=>cb(v));
        }
        const tt = spec.options?.plugins?.tooltip?.callbacks?.label;
        if (tt) tt({ raw:{m:"X",y:100,note:"n"}, parsed:{x:2024,y:100}, dataset:{label:"L — R"} });
      } catch(e){ state.warn.push("Chart callback crashed: "+e.message); }
    }
    destroy(){} draw(){}
  }
  ChartStub.defaults = { font:{}, color:"", borderColor:"" };

  const g = globalThis;
  g.window = g;
  g.document = documentStub;
  g.THREE = THREE;
  g.Chart = ChartStub;
  g.innerWidth = mobile?390:1280; g.innerHeight = mobile?844:800; g.devicePixelRatio = mobile?3:2; g.scrollY = 0;
  g.matchMedia = q => ({ matches:mobile&&q.includes("max-width"), addEventListener(){}, addListener(){} });
  g.addEventListener = () => {};
  g.requestAnimationFrame = cb => { if (state.rafCalls++ < 6) cb(16.7 * state.rafCalls); };
  g.performance = g.performance || { now: () => Date.now() };
  g.location = { hash: "" };
  g.history = { replaceState(){} };
  g.fetch = async () => ({ json: async () => JSON.parse(readFileSync(new URL("../data.json", import.meta.url), "utf8")) });
  return state;
}

async function runFile(rel, hash="", options={}){
  const src = readFileSync(new URL("../"+rel, import.meta.url), "utf8");
  const fails = [];
  const state = makeEnv(options);
  globalThis.location.hash = hash;
  try {
    await eval(`(async()=>{ ${src} })()`);
    await new Promise(r => setTimeout(r, 50));
  } catch (e) {
    fails.push("Runtime error: " + (e && e.stack ? e.stack.split("\n").slice(0,3).join(" | ") : e));
  }
  return { state, fails };
}

/* ---- unified page: frontier + three instruments ---- */
{
  const { state, fails } = await runFile("instruments.js");
  if (state.rafCalls < 1) fails.push("Render loop never started");
  if (state.rendererCount < 1) fails.push("Stage renderer not built");
  const navKids = state.elements["inst-nav"]?.children?.length || 0;
  if (navKids < 4) fails.push(`inst-nav has ${navKids} cards, expected 4`);
  const stageKids = state.elements["stage"]?.children?.length || 0;
  if (stageKids < 12) fails.push(`Stage has ${stageKids} labels, expected ≥12`);
  if (!state.elements["open-telemetry"]?.hidden) fails.push("Frontier should hide the chart overlay button");
  if (state.warn.length) fails.push(`${state.warn.length} warnings: ` + state.warn[0]);
  if (fails.length) allFails.push(...fails.map(f=>"[index] "+f));
  else console.log(`index  PASS — ${state.rendererCount} renderer, ${navKids} view cards, ${stageKids} stage labels, ${state.rafCalls} frames`);
}

/* ---- instrument deep link + overlay ---- */
{
  const { state, fails } = await runFile("instruments.js", "#horizon");
  try {
    const btn = state.elements["open-telemetry"];
    if (!btn || typeof btn.onclick !== "function") fails.push("open-telemetry button not wired (setInstrument never ran)");
    else {
      globalThis.requestAnimationFrame = cb => cb(16);  // loops exhausted; run deferred work synchronously
      btn.onclick();
      await new Promise(r=>setTimeout(r,10));
    }
  } catch(e){ fails.push("overlay open crashed: "+e.message); }
  if (state.chartCount < 2) fails.push(`Overlay built ${state.chartCount} charts, expected 2`);
  if (state.warn.length) fails.push(`${state.warn.length} warnings: ` + state.warn[0]);
  if (fails.length) allFails.push(...fails.map(f=>"[overlay] "+f));
  else console.log(`overlay PASS — horizon deep link, ${state.chartCount} charts`);
}

/* ---- phone profile: compact renderer + touch paths ---- */
{
  const { state, fails } = await runFile("instruments.js", "#compute", { mobile:true });
  if (state.pixelRatio > 1.35) fails.push(`Mobile pixel ratio is ${state.pixelRatio}, expected ≤1.35`);
  for (const event of ["touchstart","touchmove","touchend","pointerdown","pointermove","pointerup","pointercancel"]) {
    if (!state.listeners["gi-stage:"+event]?.length) fails.push(`Mobile canvas missing ${event} handler`);
  }
  const navKids = state.elements["inst-nav"]?.children?.length || 0;
  if (navKids !== 4) fails.push(`Mobile nav has ${navKids} cards, expected 4`);
  const current = state.elements["inst-nav"]?.children?.filter(c=>c.attributes["aria-current"]==="true") || [];
  if (current.length !== 1 || current[0]?.dataset.id !== "compute") fails.push("Mobile deep link did not mark exactly one active card");
  if (state.warn.length) fails.push(`${state.warn.length} warnings: ` + state.warn[0]);
  if (fails.length) allFails.push(...fails.map(f=>"[mobile] "+f));
  else console.log(`mobile  PASS — 390×844, DPR ${state.pixelRatio}, touch controls, active-card state`);
}

if (allFails.length) {
  console.error("SMOKE FAIL");
  allFails.forEach(f => console.error("  ✗ " + f));
  process.exit(1);
}
console.log("SMOKE PASS — unified page executed clean.");
