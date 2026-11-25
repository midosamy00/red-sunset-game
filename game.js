// الغروب الأحمر — Red Sunset v1 (Chapters 1+2) — Three.js r168, fully offline
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = id => document.getElementById(id);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const dist2d = (a,b)=>Math.hypot(a.x-b.x, a.z-b.z);
const rand = (a,b)=>a+Math.random()*(b-a);

// ---------------- SAVE ----------------
const SAVE_KEY='redsunset_save_v1', SAVE_BAK='redsunset_save_v1_backup', SET_KEY='redsunset_settings';
function defaultSave(){ return {version:1, playerName:'سليم أبو الليل', chapter:1, missionIdx:0, stepIdx:0,
  honor:0, rel:{marzouq:50, ramadan:50, salma:50, omran:50, mansour:50},
  flags:{}, choices:[], clues:[], journal:[], health:100, ammo:24, bandages:2, money:0,
  pos:{x:-80,z:-20}, yaw:0, seenCutscenes:[], unlocked:[], missionData:{}, chapterHonorStart:0}; }
let S = defaultSave();
function saveGame(quiet){
  try{ const prev=localStorage.getItem(SAVE_KEY); if(prev) localStorage.setItem(SAVE_BAK, prev);
    S.pos={x:player.pos.x, z:player.pos.z}; S.yaw=player.yaw; S.health=player.hp; S.ammo=player.ammo; S.bandages=player.bandages; S.money=player.money;
    localStorage.setItem(SAVE_KEY, JSON.stringify(S)); if(!quiet) toast('تم الحفظ ✓'); }catch(e){ console.warn('save failed', e); }
}
function loadSave(){
  try{ let raw=localStorage.getItem(SAVE_KEY); if(!raw) return false;
    let d=JSON.parse(raw); if(!d||d.version!==1) throw new Error('bad save');
    S=Object.assign(defaultSave(), d); return true; }
  catch(e){ try{ const b=localStorage.getItem(SAVE_BAK); if(b){ S=Object.assign(defaultSave(), JSON.parse(b)); toast('تمت الاستعادة من النسخة الاحتياطية'); return true; } }catch(_){} return false; }
}
let settings={vol:.7, quality:'auto', subSpeed:'normal'};
try{ Object.assign(settings, JSON.parse(localStorage.getItem(SET_KEY)||'{}')); }catch(_){}
function saveSettings(){ try{ localStorage.setItem(SET_KEY, JSON.stringify(settings)); }catch(_){} }

// ---------------- AUDIO (procedural WebAudio only) ----------------
let AC=null, masterGain=null, windSrc=null, windGain=null;
function initAudio(){ if(AC) return; try{ AC=new (window.AudioContext||window.webkitAudioContext)();
  masterGain=AC.createGain(); masterGain.gain.value=settings.vol; masterGain.connect(AC.destination);
  // wind: looped filtered noise
  const len=AC.sampleRate*2, buf=AC.createBuffer(1,len,AC.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
  windSrc=AC.createBufferSource(); windSrc.buffer=buf; windSrc.loop=true;
  const f=AC.createBiquadFilter(); f.type='lowpass'; f.frequency.value=420;
  windGain=AC.createGain(); windGain.gain.value=.05; windSrc.connect(f); f.connect(windGain); windGain.connect(masterGain); windSrc.start();
}catch(e){ console.warn('audio',e); } }
function setWind(v){ if(windGain&&AC) windGain.gain.linearRampToValueAtTime(v, AC.currentTime+1); }
function blip(freq,dur=.08,type='sine',vol=.2){ if(!AC) return; try{ const o=AC.createOscillator(),g=AC.createGain(); o.type=type; o.frequency.value=freq; g.gain.setValueAtTime(vol,AC.currentTime); g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+dur); o.connect(g); g.connect(masterGain); o.start(); o.stop(AC.currentTime+dur); }catch(_){} }
function gunshot(){ if(!AC) return; try{ const len=AC.sampleRate*.25, buf=AC.createBuffer(1,len,AC.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);
  const s=AC.createBufferSource(); s.buffer=buf; const g=AC.createGain(); g.gain.value=.5; s.connect(g); g.connect(masterGain); s.start(); blip(90,.15,'square',.25); }catch(_){} }
function hoof(){ blip(70,.06,'sine',.12); }
function mawwal(){ // simple flute-ish melody line for campfire scenes
  if(!AC) return; const notes=[392,440,523,587,523,440,392,330,392,440]; let t=AC.currentTime+.1;
  notes.forEach(n=>{ const o=AC.createOscillator(),g=AC.createGain(); o.type='sine'; o.frequency.value=n;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12,t+.05); g.gain.linearRampToValueAtTime(0,t+.55);
    o.connect(g); g.connect(masterGain); o.start(t); o.stop(t+.6); t+=.6; }); }

// ---------------- THREE SETUP ----------------
const canvas=$('gameCanvas');
const renderer=new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xff8c42);
scene.fog=new THREE.Fog(0xe8905a, 90, 260);
const camera=new THREE.PerspectiveCamera(60, innerWidth/innerHeight, .1, 600);
const sun=new THREE.DirectionalLight(0xffb36b, 2.2); sun.position.set(-60,55,-40); sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-70; sun.shadow.camera.right=70; sun.shadow.camera.top=70; sun.shadow.camera.bottom=-70; sun.shadow.camera.far=220;
scene.add(sun); scene.add(new THREE.AmbientLight(0xffd9a0,.55));
const hemi=new THREE.HemisphereLight(0xffd9a0,0x8a5a30,.5); scene.add(hemi);
const campLight=new THREE.PointLight(0xff8a2a, 0, 30); campLight.position.set(130,3,-88); scene.add(campLight);
addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });

// ---------------- WORLD ----------------
const WORLD={colliders:[], interactables:[], enemies:[], npcs:[], targets:[], markers:[]};
const groundMat=new THREE.MeshLambertMaterial({color:0xc9985a});
const ground=new THREE.Mesh(new THREE.PlaneGeometry(520,520,32,32), groundMat);
ground.rotation.x=-Math.PI/2; ground.receiveShadow=true;
{ const p=ground.geometry.attributes.position; for(let i=0;i<p.count;i++){ const x=p.getX(i),y=p.getY(i); const h=Math.sin(x*.05)*Math.cos(y*.04)*.6 + (Math.hypot(x,y)>150? Math.hypot(x,y)*.02:0); p.setZ(i,h);} ground.geometry.computeVertexNormals(); }
scene.add(ground);
function groundH(x,z){ return Math.sin(x*.05)*Math.cos(z*.04)*.6 + (Math.hypot(x,z)>150? Math.hypot(x,z)*.02:0); }
function addCollider(x,z,r){ WORLD.colliders.push({x,z,r}); }
function collide(pos,r){ for(const c of WORLD.colliders){ const dx=pos.x-c.x,dz=pos.z-c.z,d=Math.hypot(dx,dz); if(d<c.r+r&&d>0.001){ pos.x=c.x+dx/d*(c.r+r); pos.z=c.z+dz/d*(c.r+r);} } pos.x=clamp(pos.x,-240,240); pos.z=clamp(pos.z,-240,240); }

// sand dunes / mesas at edges
const rockMat=new THREE.MeshLambertMaterial({color:0x9a6a42});
const rockGeo=new THREE.DodecahedronGeometry(1,0);
const rocks=new THREE.InstancedMesh(rockGeo, rockMat, 90); rocks.castShadow=false; // rocks don't need to render into the shadow map
{ const m=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), v=new THREE.Vector3(), s=new THREE.Vector3();
  for(let i=0;i<90;i++){ const ang=Math.random()*Math.PI*2, r=rand(60,235); const x=Math.cos(ang)*r, z=Math.sin(ang)*r;
    e.set(rand(0,3),rand(0,3),rand(0,3)); q.setFromEuler(e); const sc=rand(1.5,7); s.set(sc,sc*.7,sc);
    m.compose(v.set(x,groundH(x,z)+sc*.3,z), q, s); rocks.setMatrixAt(i,m); }
  rocks.instanceMatrix.needsUpdate=true; }
scene.add(rocks);
const mesaMat=new THREE.MeshLambertMaterial({color:0x8a5a38});
// water pond at oasis
const pond=new THREE.Mesh(new THREE.CircleGeometry(9,24), new THREE.MeshLambertMaterial({color:0x3a7a8a}));
pond.rotation.x=-Math.PI/2; pond.position.set(2,groundH(2,2)+.15,2); scene.add(pond);
// palm / grass instancing (procedural, cheap)
function makePalm(){ const g=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.22,.35,5,6), new THREE.MeshLambertMaterial({color:0x7a5230})); trunk.position.y=2.5; trunk.castShadow=true; g.add(trunk);
  const leafMat=new THREE.MeshLambertMaterial({color:0x3f7a2a});
  for(let i=0;i<7;i++){ const leaf=new THREE.Mesh(new THREE.ConeGeometry(.7,3.4,4), leafMat); leaf.position.y=5.1; leaf.rotation.z=Math.PI/2.4; leaf.rotation.y=i/7*Math.PI*2; leaf.translateX(1.2); leaf.castShadow=true; g.add(leaf); }
  return g; }
const palmGeoTrunk=new THREE.CylinderGeometry(.22,.35,5,6);
const palmLeafGeo=new THREE.ConeGeometry(.7,3.4,4);
const palmTrunks=new THREE.InstancedMesh(palmGeoTrunk, new THREE.MeshLambertMaterial({color:0x7a5230}), 40);
const palmLeaves=new THREE.InstancedMesh(palmLeafGeo, new THREE.MeshLambertMaterial({color:0x3f7a2a}), 40*7);
{ const m=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), v=new THREE.Vector3(), s=new THREE.Vector3(1,1,1);
  let li=0;
  const spots=[]; for(let i=0;i<26;i++) spots.push([rand(-28,28), rand(-28,28)]); for(let i=0;i<14;i++) spots.push([rand(-90,90), rand(-90,90)]);
  spots.forEach(([x,z],i)=>{ const y=groundH(x,z); e.set(0,rand(0,6.28),rand(-.08,.08)); q.setFromEuler(e);
    m.compose(v.set(x,y+2.5,z),q,s); palmTrunks.setMatrixAt(i,m);
    for(let k=0;k<7;k++){ e.set(0,k/7*Math.PI*2,0); q.setFromEuler(e); const lm=new THREE.Matrix4().makeRotationY(k/7*Math.PI*2);
      const leafM=new THREE.Matrix4(); leafM.makeRotationZ(Math.PI/2.4); leafM.premultiply(lm);
      leafM.setPosition(x+Math.cos(k/7*Math.PI*2)*1.2, y+5.1, z+Math.sin(k/7*Math.PI*2)*1.2);
      palmLeaves.setMatrixAt(li++, leafM); } });
  palmTrunks.instanceMatrix.needsUpdate=true; palmLeaves.instanceMatrix.needsUpdate=true; }
palmTrunks.castShadow=true; scene.add(palmTrunks); scene.add(palmLeaves);
// grass tufts
const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.5,1.2,4), new THREE.MeshLambertMaterial({color:0x6a8a2a}), 120);
{ const m=new THREE.Matrix4(); for(let i=0;i<120;i++){ const x=rand(-160,160),z=rand(-160,160); m.makeTranslation(x,groundH(x,z)+.5,z); grass.setMatrixAt(i,m);} grass.instanceMatrix.needsUpdate=true; }
scene.add(grass);

// ---------------- GLB LOADING (on demand, defensive) ----------------
const loader=new GLTFLoader();
const glbCache={};
function loadGLB(file){ if(glbCache[file]) return Promise.resolve(glbCache[file]);
  return new Promise(res=>{ loader.load('assets/'+file, g=>{ glbCache[file]=g; res(g); }, undefined, err=>{ console.warn('GLB failed',file,err); res(null); }); }); }
// Actors must each get their OWN parsed scene: sharing one cached g.scene between
// two groups silently steals it (Object3D.add re-parents), leaving one actor empty.
function loadGLBFresh(file){ return new Promise(res=>{ loader.load('assets/'+file, g=>{ res(g); }, undefined, err=>{ console.warn('GLB failed',file,err); res(null); }); }); }
function findClip(anim, ...names){ if(!anim) return null; for(const n of names){ const c=anim.find(a=>a.name.toLowerCase().includes(n.toLowerCase())); if(c) return c; } return null; }
function makeActor(file, tint, scale=1){
  // returns {group, mixer, clips, play(name...), setTint}
  const group=new THREE.Group(); const actor={group, mixer:null, clips:[], play(){}, tint};
  actor.loaded=loadGLBFresh(file).then(g=>{ if(!g){ buildFallbackHuman(group,tint); return; }
    const src=g.scene; src.traverse(o=>{ if(o.isMesh){ o.castShadow=true; if(tint){ o.material=o.material.clone(); if(o.material.color) o.material.color.multiply(new THREE.Color(tint)); } } });
    src.scale.setScalar(scale); group.add(src); actor.clips=g.animations||[];
    actor.mixer=new THREE.AnimationMixer(src); actor._cur='';
    actor.play=(...names)=>{ const key=names.join('|'); if(actor._cur===key) return; const c=findClip(actor.clips,...names); if(!c) return; actor._cur=key; actor.mixer.stopAllAction(); const a=actor.mixer.clipAction(c); a.reset(); a.setLoop(THREE.LoopRepeat); a.play(); }; actor.play('Idle');
  });
  return actor; }
function buildFallbackHuman(group,tint){ const mat=new THREE.MeshLambertMaterial({color:tint||0xd8c8a8});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.35,1,4,8), mat); body.position.y=1.05; body.castShadow=true; group.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.24,10,8), new THREE.MeshLambertMaterial({color:0xc89a6a})); head.position.y=1.95; group.add(head);
  const hat=new THREE.Mesh(new THREE.ConeGeometry(.3,.35,8), new THREE.MeshLambertMaterial({color:0x6a4a22})); hat.position.y=2.15; group.add(hat); }
function buildFallbackHorse(group){ const mat=new THREE.MeshLambertMaterial({color:0x6a4426});
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.2,.8,.7), mat); body.position.y=1.2; body.castShadow=true; group.add(body);
  const neck=new THREE.Mesh(new THREE.BoxGeometry(.5,1,.5), mat); neck.position.set(1.1,1.7,0); neck.rotation.z=-.5; group.add(neck);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.7,.4,.4), mat); head.position.set(1.5,2.1,0); group.add(head);
  for(const [x,z] of [[-.8,-.25],[-.8,.25],[.8,-.25],[.8,.25]]){ const leg=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,1.1,6), mat); leg.position.set(x,.55,z); group.add(leg); } }

// static GLB props (houses, tents, fort pieces) — cloned after load
const propCache={};
async function loadProp(file, nodeName){ const key=file+'|'+(nodeName||''); if(propCache[key]) return propCache[key];
  const g=await loadGLB(file); if(!g) return null;
  let src=g.scene; if(nodeName){ const n=g.scene.getObjectByName(nodeName); if(n) src=n; }
  propCache[key]=src; return src; }
function cloneProp(src, x,z, ry=0, s=1){ if(!src) return null; const c=src.clone(true); c.position.set(x,groundH(x,z),z); c.rotation.y=ry; c.scale.setScalar(s);
  c.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } }); scene.add(c); return c; }
// ---- PERF: merge static clones into few draw calls (gameplay-neutral) ----
// mergeClones: clones of one GLB grouped by material (keeps original materials/textures).
function mergeClones(clones, opts={}){
  const byMat=new Map();
  for(const c of clones){ c.updateMatrixWorld(true);
    c.traverse(o=>{ if(!o.isMesh) return;
      const g=o.geometry.clone().applyMatrix4(o.matrixWorld);
      const key=o.material.uuid;
      if(!byMat.has(key)) byMat.set(key,{mat:o.material, geos:[]});
      byMat.get(key).geos.push(g); });
    if(c.parent) c.parent.remove(c); }
  for(const {mat,geos} of byMat.values()){
    const merged=mergeGeometries(geos,false);
    if(!merged){ console.warn('mergeClones failed for', mat.name); continue; }
    const m=new THREE.Mesh(merged, mat);
    m.castShadow=!!opts.castShadow; m.receiveShadow=opts.receiveShadow!==false;
    scene.add(m); }
}
// mergeClonesVertexColor: clones with plain-colour materials (no textures) merged into ONE
// vertex-coloured mesh. Used for the fort-pack pieces (49 plain materials).
function mergeClonesVertexColor(clones, opts={}){
  const geos=[];
  for(const c of clones){ c.updateMatrixWorld(true);
    c.traverse(o=>{ if(!o.isMesh) return;
      const g=o.geometry.clone().applyMatrix4(o.matrixWorld);
      const col=(o.material&&o.material.color)?o.material.color:new THREE.Color(0xffffff);
      const n=g.attributes.position.count, arr=new Float32Array(n*3);
      for(let i=0;i<n;i++){ arr[i*3]=col.r; arr[i*3+1]=col.g; arr[i*3+2]=col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr,3));
      if(!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n*2),2));
      if(!g.attributes.normal) g.computeVertexNormals();
      geos.push(g); });
    if(c.parent) c.parent.remove(c); }
  const merged=mergeGeometries(geos,false);
  if(!merged){ console.warn('mergeClonesVertexColor failed'); return; }
  const m=new THREE.Mesh(merged, new THREE.MeshLambertMaterial({vertexColors:true, side:THREE.DoubleSide}));
  m.castShadow=opts.castShadow!==false; m.receiveShadow=true; scene.add(m);
}
// Far scenery (mesa/cliff) hidden while the camera is far away — at >230 units they are
// >88% fog colour anyway, so hiding them is invisible; they reappear on approach.
// The big near mesa (190,-140) is NOT in this list: it is the visible horizon silhouette.
const FAR_SCENERY=[]; // {obj,x,z}
function updateFarScenery(){
  for(const f of FAR_SCENERY){ const d=Math.hypot(camera.position.x-f.x, camera.position.z-f.z);
    if(d>250 && f.obj.visible) f.obj.visible=false;
    else if(d<230 && !f.obj.visible) f.obj.visible=true; }
}
async function buildVillage(){
  // adobe houses — merged into ONE vertex-coloured mesh (was 6 houses x 5 meshes = 30 draws)
  const wallMat=new THREE.MeshLambertMaterial({color:0xc8a878});
  const roofMat=new THREE.MeshLambertMaterial({color:0x8a6a42});
  const spots=[[-18,-6,0],[ -14,14,.6],[16,-16,1.2],[22,8,2],[ -26,4,2.6],[8,22,.3]];
  const houseGeos=[];
  for(const [x,z,ry] of spots){ const h=new THREE.Group();
    const base=new THREE.Mesh(new THREE.BoxGeometry(7,3.4,6), wallMat); base.position.y=1.7; h.add(base);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(7.4,.5,6.4), roofMat); roof.position.y=3.6; h.add(roof);
    const parapet=new THREE.Mesh(new THREE.BoxGeometry(7.4,.7,.4), wallMat); parapet.position.set(0,4,-3); h.add(parapet);
    const door=new THREE.Mesh(new THREE.BoxGeometry(1.2,2.2,.2), new THREE.MeshLambertMaterial({color:0x4a2c14})); door.position.set(0,1.1,3.05); h.add(door);
    const win=new THREE.Mesh(new THREE.BoxGeometry(1,1,.2), new THREE.MeshLambertMaterial({color:0x2a1a08})); win.position.set(-2,2,3.05); h.add(win);
    h.position.set(x,groundH(x,z),z); h.rotation.y=ry; h.updateMatrixWorld(true);
    h.traverse(o=>{ if(o.isMesh){ const g=o.geometry.clone().applyMatrix4(o.matrixWorld);
      const col=o.material.color, n=g.attributes.position.count, arr=new Float32Array(n*3);
      for(let i=0;i<n;i++){ arr[i*3]=col.r; arr[i*3+1]=col.g; arr[i*3+2]=col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr,3)); houseGeos.push(g); } });
    addCollider(x,z,4); }
  const houseGeo=mergeGeometries(houseGeos,false);
  if(houseGeo){ const houses=new THREE.Mesh(houseGeo, new THREE.MeshLambertMaterial({vertexColors:true}));
    houses.castShadow=true; houses.receiveShadow=true; scene.add(houses); }
  const tent=await loadProp('assets/kenney/tent_detailedOpen.glb'.replace('assets/',''));
  // kenney tents live under assets/kenney/ — load directly
  const tentG=await loadGLB('kenney/tent_detailedOpen.glb');
  if(tentG){ const clones=[]; for(let i=0;i<5;i++){ const c=tentG.scene.clone(true); const x=rand(-20,20),z=rand(-24,-8); c.position.set(x,groundH(x,z),z); c.rotation.y=rand(0,6); c.scale.setScalar(1.6); scene.add(c); clones.push(c); addCollider(x,z,2.5); }
    mergeClones(clones, {castShadow:false}); } // 5 tents x 2 meshes -> 2 merged meshes, no shadow pass
  const palmG=await loadGLB('kenney/tree_palmTall.glb');
  if(palmG){ const clones=[]; for(let i=0;i<6;i++){ const c=palmG.scene.clone(true); const x=rand(-24,24),z=rand(-24,24); c.position.set(x,groundH(x,z),z); c.scale.setScalar(1.3); scene.add(c); clones.push(c); }
    mergeClones(clones, {castShadow:false}); } // 6 palms x 2 meshes -> 2 merged meshes, no shadow pass
  const campfire=await loadGLB('kenney/campfire_stones.glb');
  if(campfire){ const c=campfire.scene.clone(true); c.position.set(0,groundH(0,-10),-10); c.scale.setScalar(2); scene.add(c); }
  // fort pack pieces at mountain camp + market crates — merged into ONE vertex-coloured
  // mesh (was 7 camp pieces + 4 market crates = 22 meshes / 22 draws -> 1 draw)
  const fort=await loadGLB('fort-pack.glb');
  if(fort){ const pick=n=>fort.scene.getObjectByName(n);
    const fortClones=[];
    const place=(n,x,z,ry,s)=>{ const src=pick(n); if(!src) return; const c=src.clone(true); c.position.set(x,groundH(x,z),z); c.rotation.y=ry||0; c.scale.setScalar(s||1); fortClones.push(c); };
    place('guard-tower-L1_8',138,-78,0,1.2); place('command-tent_4',124,-96,1,1); place('tent_14',136,-98,2,1); place('stables_13',118,-80,0,1);
    place('crate_5',128,-86,0,1); place('campfire_3',130,-88,0,1.5); place('fort-fence_6',130,-70,0,1);
    // market stalls (Asyut market, west) — crates
    const crate=pick('crate_5');
    for(let i=0;i<4;i++){ if(!crate) break; const c=crate.clone(true); const x=-70+i*6, z=48+((i%2)*5); c.position.set(x,groundH(x,z),z); c.scale.setScalar(1.4); fortClones.push(c); addCollider(x,z,2); }
    mergeClonesVertexColor(fortClones, {castShadow:true});
  }
  const mesa=await loadProp('desert-mesa.glb');
  if(mesa){ cloneProp(mesa,190,-140,0,6); cloneProp(mesa,-190,120,.5,7);
    const farMesa=cloneProp(mesa,150,170,1,5); if(farMesa) FAR_SCENERY.push({obj:farMesa, x:150, z:170}); }
  const cliff=await loadProp('cliff-wall.glb');
  if(cliff){ const c1=cloneProp(cliff,150,-120,0,3); if(c1) FAR_SCENERY.push({obj:c1, x:150, z:-120});
    const c2=cloneProp(cliff,170,-60,.8,3); if(c2) FAR_SCENERY.push({obj:c2, x:170, z:-60}); }
}

// ---------------- PLAYER ----------------
const player={ pos:new THREE.Vector3(-80,0,-20), yaw:0, hp:100, ammo:24, bandages:2, money:0,
  speed:0, riding:false, crouched:false, carrying:null, onHorse:null, vel:new THREE.Vector3() };
const salim=makeActor('adventurer-quaternius.glb', 0xffffff, 1);
salim.group.position.copy(player.pos); scene.add(salim.group);
const horseActor=makeActor('horse-quaternius.glb', 0xffffff, 1);
horseActor.group.position.set(-78,0,-18); scene.add(horseActor.group);
let horseLoaded=false; setTimeout(()=>{ if(!horseActor.group.children.length){ buildFallbackHorse(horseActor.group); } },4000);
// NPC registry
const npcs={};
function spawnNPC(key, file, tint, x,z, name){ if(npcs[key]) scene.remove(npcs[key].actor.group);
  const a=makeActor(file,tint,1); a.group.position.set(x,groundH(x,z),z); scene.add(a.group);
  npcs[key]={actor:a, name, home:{x,z}, hp:100, alive:true}; return npcs[key]; }
function placeNPC(key,x,z,ry=0){ const n=npcs[key]; if(!n) return; n.actor.group.position.set(x,groundH(x,z),z); n.actor.group.rotation.y=ry; n.home={x,z}; }

// ---------------- UI helpers ----------------
let toastTimer=null;
function toast(msg, ms=3200){ const t=$('toast'); t.textContent=msg; t.style.display='block'; clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.style.display='none', ms); }
function honorLabel(h){ if(h>=60) return 'الشريف'; if(h>=20) return 'المحترم'; if(h<=-60) return 'العار'; if(h<=-20) return 'المخيف'; return 'محايد'; }
function addHonor(n, why){ S.honor=clamp(S.honor+n,-100,100); toast((n>0?'+':'')+n+' شرف — '+why, 2600); blip(n>0?660:220,.15,'sine',.2); updateHUD(); }
function addRel(key,n){ S.rel[key]=clamp((S.rel[key]||50)+n,0,100); updateHUD(); }
function addClue(text){ if(!S.clues.includes(text)){ S.clues.push(text); toast('📖 دليل جديد في دفتر سليم: '+text, 4000); } }
function addJournal(text){ S.journal.push(text); }
function setFlag(k,v=true){ S.flags[k]=v; }
function updateHUD(){
  $('hpBar').style.width=clamp(player.hp,0,100)+'%';
  $('honorLabel').textContent=honorLabel(S.honor);
  $('honorBar').style.width=((S.honor+100)/2)+'%';
  $('ammoText').textContent=player.ammo; $('bandText').textContent=player.bandages; $('moneyText').textContent=player.money+' ج.م';
  $('relLine').textContent='مرزوق '+(S.rel.marzouq||50)+' • رمضان '+(S.rel.ramadan||50)+' • سلمى '+(S.rel.salma||50)+' • منصور '+(S.rel.mansour||50);
}
function setObjective(ch, text){ $('chLabel').textContent=ch; $('objText').textContent=text; }
let objectiveTarget=null; // {x,z}
function setMarker(x,z){ objectiveTarget={x,z}; }

// ---------------- DIALOGUE ----------------
let dlgQueue=[], dlgChoices=null, dlgResolve=null, dlgActive=false, dlgChoicesShown=false;
function showDialogue(lines, choices){ // lines: [{who,text}] ; choices: [{text, sub?, apply}]
  return new Promise(res=>{ dlgQueue=lines.slice(); dlgChoices=choices||null; dlgChoicesShown=false; dlgResolve=res; dlgActive=true;
    $('dialogue').classList.remove('hidden'); $('dlgChoices').innerHTML=''; nextDlgLine(); }); }
function nextDlgLine(){
  if(!dlgQueue.length){ if(dlgChoices){ renderChoices(); return; } closeDialogue(); return; }
  const l=dlgQueue.shift(); $('dlgName').textContent=l.who||'';
  typeText($('dlgText'), l.text); $('dlgHint').textContent=dlgChoices||dlgQueue.length?'':'اضغط E أو انقر للمتابعة';
  $('dlgHint').textContent = dlgQueue.length? 'اضغط E أو انقر للمتابعة' : (dlgChoices? 'اختر ردك — لا يمكن تخطي الاختيار' : 'اضغط E أو انقر للمتابعة');
}
function typeText(el, text){ const sp=settings.subSpeed==='fast'?6:settings.subSpeed==='slow'?45:18; el.textContent=''; let i=0;
  clearInterval(el._t); el._t=setInterval(()=>{ i++; el.textContent=text.slice(0,i); if(i>=text.length) clearInterval(el._t); }, sp); }
function renderChoices(){ const box=$('dlgChoices'); box.innerHTML=''; dlgChoicesShown=true; $('dlgHint').textContent='اختر — لا يمكن تخطي الاختيار';
  dlgChoices.forEach(c=>{ const b=document.createElement('button'); b.textContent=c.text; b.onclick=()=>{ blip(520,.08); if(c.apply) c.apply(); closeDialogue(c); }; box.appendChild(b); }); }
function closeDialogue(choice){ $('dialogue').classList.add('hidden'); $('dlgChoices').innerHTML=''; dlgChoicesShown=false; dlgActive=false; const r=dlgResolve; dlgResolve=null; if(r) r(choice||null); }
$('dialogue').addEventListener('click',(e)=>{ if(e.target.closest('button')) return; if(dlgActive && (!dlgChoices || !dlgChoicesShown)) nextDlgLine(); });

// ---------------- CUTSCENES (JSON-driven) ----------------
const CUTSCENES={
 C1:{title:'قبل عشر سنين', shots:[
   {cam:[-120,26,-60], look:[0,4,0], dur:6, lines:[{who:'الراوي', text:'سنة 1914… قبل عشر سنين… سليم أبو الليل كان لسه شاب، ولسه بيصدّق إن القانون بيحمي الأبرياء.'}]},
   {cam:[-30,10,30], look:[0,3,0], dur:6, lines:[{who:'الراوي', text:'الواحة كانت هادية… نخيل وبئر وعائلات… ومخبأ عصابة قديمة مختبية وسطهم.'}]},
   {cam:[-70,6,-30], look:[-80,2,-20], dur:5, lines:[{who:'سليم', text:'أنا اللي دلّيتهم على الواحة… كنت فاكر إن ده الصح.'}]},
   {cam:[0,14,40], look:[0,2,0], dur:4, lines:[{who:'', text:'الفصل الأول — الواحة'}]}]},
 C2:{title:'الفجر', shots:[
   {cam:[-40,12,-50], look:[0,3,0], dur:4, lines:[{who:'قائد الدورية', text:'الفجر قرّب… الهجانة تتحرك في صفوف. محدش يوقف!'}]},
   {cam:[-20,5,10], look:[0,2,0], dur:4, lines:[{who:'سليم', text:'(يلمس خاتمه) هنفرّق بينهم… إن شاء الله.'}]}]},
 C3:{title:'المكان ده', shots:[
   {cam:[8,4,14], look:[0,2,0], dur:5, lines:[{who:'الشيخ مرزوق', text:'المكان ده… أنا دفنت فيه ناس قبل كده.'}]},
   {cam:[2,2.5,6], look:[0,1.5,0], dur:5, lines:[{who:'سليم', text:'(ينظر لتحت ويلمس خاتمه… صمت)'}]},
   {cam:[10,3,-8], look:[0,2,0], dur:3, lines:[{who:'الشيخ مرزوق', text:'نكمّل.'}]}]},
 C4:{title:'الغروب الأحمر', shots:[
   {cam:[-30,8,30], look:[0,2,0], dur:6, lines:[{who:'الراوي', text:'وقف سليم لوحده… والشمس بتغرب على النيل… وعرف إن الذنب ده مش هيسيبه.'}]},
   {cam:[0,4,18], look:[0,1.5,0], dur:5, lines:[{who:'سليم', text:'طيب؟… أنا مش طيب. أنا بس… لسه عايش.'}]},
   {cam:[-60,10,60], look:[-70,2,50], dur:5, lines:[{who:'الحاج منصور', text:'إنت من الليلة واحد من أولاد الليل.'}]}]},
 C5:{title:'قافلة المرتبات', shots:[
   {cam:[-60,14,80], look:[-20,3,90], dur:6, lines:[{who:'الحاج منصور', text:'قافلة جمال محملة بمرتبات الهجانة… دي الضربة اللي هتخلّصنا!'}]},
   {cam:[-30,5,70], look:[-20,2,85], dur:5, lines:[{who:'سليم', text:'سمعت الجملة دي قبل كده… كتير.'}]},
   {cam:[-20,10,95], look:[0,2,0], dur:4, lines:[{who:'', text:'الفصل الثاني — العاصفة'}]}]},
 C6:{title:'الرمل جاي', shots:[
   {cam:[-10,16,60], look:[40,6,120], dur:5, lines:[{who:'سلمى', text:'الرمل جاي!'}]},
   {cam:[0,6,70], look:[20,3,100], dur:4, lines:[{who:'الحاج منصور', text:'كل واحد يمسك حصانه! العاصفة جاية!'}]}]},
 C7:{title:'أول نظرة', shots:[
   {cam:[30,5,40], look:[60,3,70], dur:5, lines:[{who:'سليم', text:'ده اليوزباشي فؤاد…'}]},
   {cam:[55,3,62], look:[62,2.5,72], dur:5, lines:[{who:'الراوي', text:'فؤاد يشدّ قبعته… المطاردة دي شخصية.'}]}]},
 C8:{title:'الضربة الأخيرة', shots:[
   {cam:[120,5,-78], look:[130,2,-88], dur:6, lines:[{who:'الحاج منصور', text:'اللي حصل النهاردة كان جزء من الخطة… الضربة الأخيرة لسه جاية — قطر المرتبات في أسيوط!'}]},
   {cam:[126,3,-84], look:[130,2,-88], dur:5, lines:[{who:'سليم', text:'وكل واحد فيهم كان مصدّق… أو عامل نفسه مصدّق.'}]}]},
};
let cutsceneActive=false, cutsceneId=null, csShotIdx=0, csShotT=0, csLines=[], csResolve=null;
function playCutscene(id){ return new Promise(res=>{ if(S.seenCutscenes.includes(id)&&false){} cutsceneId=id; cutsceneActive=true; csShotIdx=0; csShotT=0; csResolve=res;
  $('cutscene').classList.add('on'); $('subtitle').classList.remove('hidden'); $('skipBtn').classList.remove('hidden'); $('skipHint').classList.remove('hidden');
  $('hud').classList.add('hidden'); setWind(.12); startShot(); }); }
function startShot(){ const cs=CUTSCENES[cutsceneId]; if(!cs||csShotIdx>=cs.shots.length){ endCutscene(); return; }
  const sh=cs.shots[csShotIdx]; csLines=sh.lines||[]; csShotT=0;
  $('subtitle').innerHTML=csLines.map(l=> (l.who?'<span class="spk">'+l.who+': </span>':'')+l.text).join('<br>');
  if(csShotIdx===0 && cs.title && cutsceneId==='C1') showChapterTitle('الفصل الأول — الواحة');
  if(csShotIdx===0 && cutsceneId==='C5') showChapterTitle('الفصل الثاني — العاصفة'); }
function showChapterTitle(t){ const el=$('chapterTitle'); el.textContent=t; el.style.display='block'; setTimeout(()=>el.style.display='none', 3000); }
function endCutscene(){ cutsceneActive=false; $('cutscene').classList.remove('on'); $('subtitle').classList.add('hidden'); $('skipBtn').classList.add('hidden'); $('skipHint').classList.add('hidden');
  $('hud').classList.remove('hidden'); if(cutsceneId && !S.seenCutscenes.includes(cutsceneId)) S.seenCutscenes.push(cutsceneId);
  saveGame(true); const r=csResolve; csResolve=null; cutsceneId=null; if(r) r(); }
let skipPressT=0;
$('skipBtn').addEventListener('pointerdown',()=>{ skipPressT=Date.now(); });
$('skipBtn').addEventListener('pointerup',()=>{ if(!cutsceneActive) return; const held=Date.now()-skipPressT;
  if(held>700){ endCutscene(); } else { csShotIdx++; startShot(); } });

// ---------------- INPUT ----------------
const keys={}; let mouseDown=false, camYaw=0, camPitch=.35, eagleEye=false, eagleMeter=100, spyglassOn=false;
addEventListener('keydown',e=>{ keys[e.key.toLowerCase()]=true;
  if(e.key==='Escape'){ togglePause(); }
  if(e.key.toLowerCase()==='j'){ toggleJournal(); }
  if(e.key.toLowerCase()==='e'){ advanceOrInteract(); }
  if(e.key.toLowerCase()==='q'){ toggleEagle(); }
  if(e.key.toLowerCase()==='b'){ toggleSpyglass(); }
  if(e.key.toLowerCase()==='c'){ player.crouched=!player.crouched; toast(player.crouched?'انحنيت — تسلل':'وقفت'); }
  if(e.key.toLowerCase()==='r'){ toggleMount(); }
  if(e.key.toLowerCase()==='f'){ useBandage(); }
});
addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });
canvas.addEventListener('mousedown',e=>{ mouseDown=true; if(e.button===0 && !cutsceneActive && !dlgActive && gameStarted) shoot(); });
addEventListener('mouseup',()=>mouseDown=false);
let lastMX=0,lastMY=0;
canvas.addEventListener('mousemove',e=>{ if(mouseDown){ camYaw-=(e.clientX-lastMX)*.005; camPitch=clamp(camPitch+(e.clientY-lastMY)*.004,-.2,1.1);} lastMX=e.clientX; lastMY=e.clientY; });
canvas.addEventListener('touchstart',e=>{ const t=e.touches[0]; lastMX=t.clientX; lastMY=t.clientY; },{passive:true});
canvas.addEventListener('touchmove',e=>{ const t=e.touches[0]; camYaw-=(t.clientX-lastMX)*.006; camPitch=clamp(camPitch+(t.clientY-lastMY)*.005,-.2,1.1); lastMX=t.clientX; lastMY=t.clientY; },{passive:true});
// joystick
let joyActive=false, joyVec={x:0,y:0};
const joyEl=$('joy'), knob=$('joyKnob');
joyEl.addEventListener('pointerdown',e=>{ joyActive=true; joyEl.setPointerCapture(e.pointerId); moveJoy(e); });
joyEl.addEventListener('pointermove',e=>{ if(joyActive) moveJoy(e); });
joyEl.addEventListener('pointerup',()=>{ joyActive=false; joyVec={x:0,y:0}; knob.style.left='34px'; knob.style.top='34px'; });
function moveJoy(e){ const r=joyEl.getBoundingClientRect(); let dx=(e.clientX-r.left-60)/50, dy=(e.clientY-r.top-60)/50; const l=Math.hypot(dx,dy); if(l>1){dx/=l;dy/=l;} joyVec={x:dx,y:dy}; knob.style.left=(34+dx*34)+'px'; knob.style.top=(34+dy*34)+'px'; }
$('btnShoot').onclick=()=>shoot(); $('btnMount').onclick=()=>toggleMount(); $('btnEagle').onclick=()=>toggleEagle(); $('btnSpy').onclick=()=>toggleSpyglass();
$('btnCrouch').onclick=()=>{ player.crouched=!player.crouched; toast(player.crouched?'انحنيت — تسلل':'وقفت'); };
$('btnJump').onclick=()=>{ if(!player.riding) toast('قفزت'); };
$('btnPause').onclick=()=>togglePause(); $('interactBtn').onclick=()=>advanceOrInteract();
function toggleEagle(){ if(!gameStarted) return; eagleEye=!eagleEye; $('eagleTint').style.display=eagleEye?'block':'none'; if(eagleEye){ toast('🦅 عين الصقر — الوقت يبطؤ…'); blip(880,.2,'sine',.15); } }
function toggleSpyglass(){ if(!gameStarted) return; spyglassOn=!spyglassOn; $('spyglass').style.display=spyglassOn?'block':'none'; camera.fov=spyglassOn?22:60; camera.updateProjectionMatrix(); if(spyglassOn) toast('🔭 منظار — راقب من بعيد'); }
function useBandage(){ if(player.bandages<=0){ toast('لا توجد ضمادات'); return; } if(player.hp>=100){ toast('صحتك كاملة'); return; }
  player.bandages--; player.hp=clamp(player.hp+40,0,100); toast('🩹 ضمّدت جرحك (+40 صحة)'); updateHUD(); }
function toggleMount(){ if(!gameStarted||cutsceneActive||dlgActive) return;
  if(player.riding){ player.riding=false; player.pos.set(horseActor.group.position.x,0,horseActor.group.position.z+2); toast('نزلت من الحصان'); salim.play('Idle'); }
  else { const d=dist2d(player.pos, horseActor.group.position); if(d>6){ toast('اقترب من الحصان أولًا'); return; }
    player.riding=true; toast('ركبت الحصان — Shift للعدو'); horseActor.play('Gallop'); } }
function toggleJournal(){ const p=$('journalPanel'); if(p.style.display==='flex'){ p.style.display='none'; return; }
  $('journalBody').innerHTML = '<h3>الأدلة</h3>'+ (S.clues.length? S.clues.map(c=>'<div class="journal-entry">🔎 '+c+'</div>').join('') : '<p>لا أدلة بعد.</p>')
   + '<h3>الأعلام</h3><p>'+Object.keys(S.flags).map(k=>k+' ✓').join(' • ')+'</p>'
   + '<h3>الاختيارات</h3>'+ (S.choices.length? S.choices.map(c=>'<div class="journal-entry">✔ '+c+'</div>').join('') : '<p>لا اختيارات بعد.</p>')
   + '<h3>اليوميات</h3>'+ (S.journal.length? S.journal.map(j=>'<div class="journal-entry">'+j+'</div>').join('') : '<p>—</p>');
  p.style.display='flex'; }
$('journalClose').onclick=()=>$('journalPanel').style.display='none';
let paused=false;
function togglePause(){ if(!gameStarted) return; paused=!paused; $('pausePanel').style.display=paused?'flex':'none'; if(paused) saveGame(true); }
$('resumeBtn').onclick=()=>togglePause();
$('saveBtn').onclick=()=>saveGame();
$('journalBtn').onclick=()=>{ $('pausePanel').style.display='none'; paused=false; toggleJournal(); };
$('quitBtn').onclick=()=>{ saveGame(true); location.reload(); };

// ---------------- SHOOTING ----------------
const raycaster=new THREE.Raycaster();
let muzzleFlash=0;
function shoot(){ if(!gameStarted||paused||cutsceneActive||dlgActive) return; if(player.ammo<=0){ toast('لا ذخيرة! ابحث عن ذخيرة'); blip(160,.1,'square',.2); return; }
  player.ammo--; gunshot(); updateHUD(); muzzleFlash=.08;
  if(salim.play) salim.play('Gun_Shoot'); setTimeout(()=>{ if(!player.riding) salim.play('Idle'); },400);
  // ray from the player's chest along the facing direction (does not depend on the lagging camera)
  const spread=(Math.random()-.5)*.008;
  const dir=new THREE.Vector3(-Math.sin(camYaw+spread)*Math.cos(camPitch), -0.015, -Math.cos(camYaw+spread)*Math.cos(camPitch)).normalize();
  raycaster.set(new THREE.Vector3(player.pos.x, player.pos.y+1.6, player.pos.z), dir);
  // targets
  for(const t of WORLD.targets){ if(t.hit) continue; const hits=raycaster.intersectObject(t.mesh,true); if(hits.length){ t.hit=true; t.mesh.visible=false; blip(990,.15); onTargetHit(t); return; } }
  // enemies
  for(const e of WORLD.enemies){ if(!e.alive) continue; const hits=raycaster.intersectObject(e.npc.actor.group,true); if(hits.length){ damageEnemy(e, 50); return; } }
  // civilians hit by stray bullet?
  for(const c of WORLD.civilians||[]){ if(!c.alive) continue; const hits=raycaster.intersectObject(c.actor.group,true); if(hits.length){ c.alive=false; c.actor.group.visible=false; addHonor(-15,'رصاصة طائشة قتلت مدنيًا'); toast('رصاصة طائشة… وصوت بكاء توقف فجأة',5000); return; } }
}
let swayPhase=0; function sway(){ swayPhase+=.7; return Math.sin(swayPhase)*.012; }
function damageEnemy(e, dmg){ e.hp-=dmg; blip(300,.08,'square',.2); if(e.hp<=0){ e.alive=false; e.npc.actor.group.visible=false; e.npc.actor.play&&e.npc.actor.play('Death'); toast('أصبت '+e.npc.name); if(e.onDeath) e.onDeath(); } }
function onTargetHit(t){ if(currentMission && currentMission.onTarget) currentMission.onTarget(t); }

// ---------------- INTERACTABLES ----------------
function addInteract(id, x,z, label, action, cond){ WORLD.interactables.push({id,x,z,label,action,cond}); }
function nearestInteract(){ let best=null,bd=4; for(const it of WORLD.interactables){ if(it.cond && !it.cond()) continue; const d=dist2d(player.pos,it); if(d<bd){bd=d;best=it;} } return best; }
function advanceOrInteract(){ if(dlgActive){ nextDlgLine(); return; } const it=nearestInteract(); if(it){ blip(520,.07); it.action(); } }

// ---------------- MISSION ENGINE (async steps) ----------------
let gameStarted=false, currentMission=null, missionToken=0;
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
async function waitFor(cond, timeoutMs=300000){ const t0=Date.now(); while(!cond()){ if(Date.now()-t0>timeoutMs) return false; await wait(120); } return true; }
async function waitReach(x,z,r=4){ setMarker(x,z); return waitFor(()=>dist2d(player.pos,{x,z})<r); }
function teleportPlayer(x,z,yaw=0){ player.pos.set(x,0,z); player.yaw=yaw; camYaw=yaw; horseActor.group.position.set(x+2,groundH(x+2,z),z+2); }
function mountHorseNow(){ player.riding=true; }

function spawnEnemy(key, file, tint, x,z, name, hp=60){ const npc=spawnNPC(key,file,tint,x,z,name); const e={npc, hp, alive:true, x,z}; WORLD.enemies.push(e); return e; }
function clearEnemies(){ for(const e of WORLD.enemies){ if(e.npc) e.npc.actor.group.visible=false; } WORLD.enemies=[]; }
function spawnCivilian(key,file,tint,x,z,name){ const npc=spawnNPC(key,file,tint,x,z,name); WORLD.civilians=WORLD.civilians||[]; WORLD.civilians.push({actor:npc.actor, alive:true, name}); return npc; }

// ---- NPC cast (spawned once, repositioned per mission) ----
function spawnCast(){
  spawnNPC('mansour','base-character-quaternius.glb',0x8a6a3a,130,-88,'الحاج منصور');
  spawnNPC('salma','casual-woman.glb',0x4a7a3a,128,-84,'سلمى');
  spawnNPC('omran','worker-quaternius.glb',0xc8a060,132,-84,'عمران');
  spawnNPC('ramadan','casual-character-quaternius.glb',0x6a8ac8,-20,20,'رمضان');
  spawnNPC('marzouq','farmer-quaternius.glb',0xaaaaaa,0,0,'الشيخ مرزوق');
  spawnNPC('fouad','soldier.glb',0xe8e0c8,60,70,'اليوزباشي فؤاد');
  spawnNPC('captain','soldier.glb',0xc8b060,-70,-25,'قائد الدورية');
  spawnNPC('guard1','soldier.glb',0xc8b060,-72,-22,'جندي هجانة');
  spawnNPC('guard2','soldier.glb',0xc8b060,-68,-28,'جندي هجانة');
  // gang gunmen / civilians for raid
  spawnNPC('gunman1','farmer-quaternius.glb',0x7a3a2a,10,5,'رجل عصابة');
  spawnNPC('gunman2','worker-quaternius.glb',0x7a3a2a,-8,10,'رجل عصابة');
  spawnNPC('gunman3','farmer-quaternius.glb',0x7a3a2a,14,-8,'رجل عصابة');
  spawnNPC('woman1','casual-woman.glb',0xd8a0a0,-6,-6,'امرأة من الواحة');
  spawnNPC('child1','casual-character-quaternius.glb',0xd8c8a0,4,-12,'الطفل');
  spawnNPC('civil1','casual-man.glb',0xb8a888,12,12,'رجل من الواحة');
  // white horse for Fouad (separate actor)
  const fh=makeActor('horse-quaternius.glb',0xffffff,1); fh.group.position.set(60,groundH(60,70),70); scene.add(fh.group); npcs.fouadHorse={actor:fh, name:'حصان فؤاد'};
  for(const k of Object.keys(npcs)) npcs[k].actor.group.visible=false;
  npcs.fouadHorse.actor.group.visible=false;
}
function showNPC(key, x,z, ry=0){ const n=npcs[key]; if(!n) return; n.actor.group.visible=true; placeNPC(key,x,z,ry); n.alive=true; }
function hideNPC(key){ const n=npcs[key]; if(n) n.actor.group.visible=false; }
function hideAllNPCs(){ for(const k of Object.keys(npcs)) hideNPC(k); }

// ---- shared helpers for missions ----
async function rideAlong(waypoints, companions){ // waypoints: [{x,z}] player rides; companions follow loosely
  for(const wp of waypoints){ setMarker(wp.x,wp.z); await waitReach(wp.x,wp.z,6); }
}
function makeTargets(n, cx,cz){ WORLD.targets=[]; const mat=new THREE.MeshLambertMaterial({color:0x8a5a28});
  for(let i=0;i<n;i++){ const m=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,.25,12), mat); const x=cx+i*4-8, z=cz; m.position.set(x,groundH(x,z)+1.2,z); m.rotation.x=Math.PI/2; m.castShadow=true; scene.add(m);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,1.2,6), new THREE.MeshLambertMaterial({color:0x5a3a1a})); post.position.set(x,groundH(x,z)+.6,z); scene.add(post);
    WORLD.targets.push({mesh:m, hit:false, post}); } }
function clearTargets(){ for(const t of WORLD.targets){ scene.remove(t.mesh); scene.remove(t.post);} WORLD.targets=[]; }

// ---------------- MISSIONS ----------------
const MISSIONS=[
{ id:'1.1', chapter:1, title:'الطريق إلى الواحة', steps: async()=>{
  setObjective('الفصل 1 — الواحة','اركب حصانك واتبع دورية الهجانة إلى الواحة');
  teleportPlayer(-80,-20,-1.4); mountHorseNow(); horseActor.group.visible=true;
  showNPC('captain',-76,-24); showNPC('guard1',-74,-18); showNPC('guard2',-78,-14);
  toast('استخدم WASD أو الأسهم أو عصا اللمس للركوب — اتبع الدورية',5000);
  await showDialogue([
    {who:'قائد الدورية', text:'إنت متأكد يا سليم؟ العصابة دي مختبية في الواحة من شهور.'},
    {who:'سليم', text:'متأكد يا أفندم. شفتهم بعيني وأنا ماشي في الواحة.'},
    {who:'جندي هجانة', text:'والمدنيين اللي في الواحة؟'},
    {who:'قائد الدورية', text:'العصابة بتستخبى وسطهم… هنفرّق بينهم ساعة المداهمة.'},
    {who:'سليم (لنفسه)', text:'هنفرّق بينهم… إن شاء الله.'}]);
  await rideAlong([{x:-50,z:-25},{x:-30,z:-10},{x:-15,z:5}]);
  setObjective('الفصل 1 — الواحة','وصلت لنقطة المراقبة فوق الواحة');
  await waitReach(-8,0,6); toast('وصلت لنقطة المراقبة ✓'); addJournal('وصلت للواحة مع دورية الهجانة — أنا اللي دلّيتهم عليها.');
}},
{ id:'1.2', chapter:1, title:'الرماية قبل المداهمة', steps: async()=>{
  setObjective('الفصل 1 — الواحة','أصِب الأهداف الخشبية الخمسة (Q = عين الصقر)');
  teleportPlayer(-8,0,3.14); player.riding=false; horseActor.group.position.set(-10,groundH(-10,2),2);
  makeTargets(5,-2,14); let hits=0, firstShot=true;
  currentMission.onTarget=()=>{ hits++; toast('إصابة! '+hits+' / 5'); if(firstShot){ firstShot=false; } updateHUD(); };
  setMarker(-2,14);
  await showDialogue([{who:'قائد الدورية', text:'صوّب… اضغط للتركيز. عين الصقر هتبطّأ الوقت — ويدك… هترتعش شوية. طبيعي.'}]);
  toast('صوّب بالفأرة واضغط للإطلاق — Q لعين الصقر، B للمنظار',5000);
  await waitFor(()=>hits>=5, 600000);
  clearTargets(); if(hits>=5) toast('كل الأهداف من أول محاولة؟ ثبات يدك تحسّن ✓');
  setObjective('الفصل 1 — الواحة','راقب الواحة بالمنظار (B) — عدّ الخيام ولاحظ العائلات');
  await showDialogue([{who:'سليم (بالمنظار)', text:'خيام… أطفال بيلعبوا قرب البئر… عائلات. دي مش عصابة بس.'}]);
  await waitFor(()=>spyglassOn, 120000); if(spyglassOn) toggleSpyglass();
  await showDialogue([{who:'قائد الدورية', text:'كفاية مراقبة. الفجر قرّب — كل واحد يعرف دوره في المداهمة.'}]);
  await playCutscene('C2');
}},
{ id:'1.3', chapter:1, title:'المداهمة', steps: async()=>{
  setObjective('الفصل 1 — الواحة','اقتحم الواحة مع الدورية — اقضِ على رجال العصابة');
  teleportPlayer(-6,2,2.5); player.ammo=Math.max(player.ammo,30);
  showNPC('woman1',-6,-6); showNPC('civil1',12,12);
  const e1=spawnEnemy('gunman1','farmer-quaternius.glb',0x7a3a2a,10,5,'رجل عصابة');
  const e2=spawnEnemy('gunman2','worker-quaternius.glb',0x7a3a2a,-8,10,'رجل عصابة');
  const e3=spawnEnemy('gunman3','farmer-quaternius.glb',0x7a3a2a,14,-8,'رجل عصابة');
  await Promise.all([e1,e2,e3].map(e=>e.npc.actor.loaded)); // don't let the player shoot at unloaded (invisible) enemies
  await showDialogue([
    {who:'قائد الدورية', text:'محدش يوقف! اللي شايل سلاح عصابة!'},
    {who:'امرأة (تصرخ)', text:'إحنا مش عصابة! إحنا أهالي الواحة!'},
    {who:'سليم (لنفسه)', text:'أهالي؟… أنا قلت لهم إن الواحة مخبأ عصابة… أنا اللي جبتهم هنا.'},
    {who:'جندي', text:'يا سليم! إنت واقف ليه؟!'}]);
  toast('أطلق النار على رجال العصابة — احذر المدنيين!',5000);
  await waitFor(()=>!e1.alive&&!e2.alive&&!e3.alive, 600000);
  clearEnemies(); hideNPC('gunman1'); hideNPC('gunman2'); hideNPC('gunman3');
  // diamond choice
  const choice=await showDialogue([{who:'امرأة من الواحة', text:'أرجوك… عيالي في الخيمة دي! الدورية جاية من الناحية دي!'}],
    [{text:'⚠️ حذّر العائلة ودلّها على مخرج آمن', apply:()=>{ setFlag('warned_family'); S.choices.push('1.3: حذّرت عائلة الواحة ودللتها على مخرج آمن'); addHonor(10,'حذّرت عائلة في المداهمة'); }},
     {text:'أكمل القتال دون توقف', apply:()=>{ S.choices.push('1.3: أكملت القتال دون تحذير العائلة'); addHonor(-5,'أكملت القتال دون توقف'); }}]);
  // carry wounded civilian
  setObjective('الفصل 1 — الواحة','احمل الجريح المدني إلى مكان آمن');
  showNPC('civil1',12,12); addInteract('carry1',12,12,'احمل الجريح',()=>{ player.carrying='civilian'; hideNPC('civil1'); toast('تحمل الجريح — امشِ ببطء إلى الخيمة الآمنة'); setMarker(-14,-14); },()=>!player.carrying);
  await waitFor(()=>player.carrying==='civilian', 300000);
  await waitReach(-14,-14,5); player.carrying=null; addHonor(10,'أنقذت مدنيًا جريحًا'); addJournal('حملت جريحًا من تحت خيمة محترقة. عينه كانت بتسألني: ليه؟');
  toast('أنقذت الجريح ✓');
}},
{ id:'1.4', chapter:1, title:'بعد المداهمة', steps: async()=>{
  setObjective('الفصل 1 — الواحة','امشِ في الواحة واقرأ رسائل الضحايا (3 رسائل)');
  let read=0;
  const letters=[{x:8,z:-4,t:'رسالة 1: «يا أمي… الواحة كانت آمنة قبل ما ييجوا…»'},{x:-12,z:8,t:'رسالة 2: «خبّيت الفلوس تحت البئر… لعيالي.»'},{x:4,z:16,t:'رسالة 3: «لو حد لقى الرسالة دي… قولوا لعيالي إن أبوهم كان بيحبهم.»'}];
  for(const L of letters){ addInteract('letter'+L.x+'_'+L.z, L.x,L.z,'اقرأ الرسالة',()=>{ if(L.done) return; L.done=true; read++; addClue(L.t); addJournal(L.t); toast(L.t,5000); setMarker(0,0); },()=>!L.done); }
  setMarker(8,-4);
  await waitFor(()=>read>=3, 600000);
  if(read>=3){ addHonor(5,'قرأت كل رسائل الضحايا'); setFlag('oasis_guilt'); }
  showNPC('marzouq',2,-2);
  setObjective('الفصل 1 — الواحة','قابل الشيخ مرزوق عند القبور');
  await waitReach(2,-2,5);
  await playCutscene('C3');
  await showDialogue([
    {who:'الشيخ مرزوق', text:'إنت اللي دلّيتهم؟'},
    {who:'سليم', text:'(صمت… يلمس خاتمه)'},
    {who:'الشيخ مرزوق', text:'أنا كنت إمام الهجانة… دفنت ناس كتير. بس المكان ده… مختلف.'}]);
  addRel('marzouq',5);
}},
{ id:'1.5', chapter:1, title:'الناجي', steps: async()=>{
  setObjective('الفصل 1 — الواحة','اتبع صوت البكاء — ارفع الأنقاض وأنقذ الطفل');
  showNPC('child1',4,-12);
  toast('🔊 صوت بكاء ضعيف من تحت خيمة منهارة…',5000); blip(700,.3,'sine',.15);
  await waitReach(4,-12,5);
  addInteract('rubble',4,-12,'ارفع الأنقاض',()=>{ hideNPC('child1'); player.carrying='child'; toast('لقيت طفل حي تحت الأنقاض! احمله لقافلة الأهالي الناجين'); setMarker(-30,20); },()=>!player.carrying);
  await waitFor(()=>player.carrying==='child', 300000);
  await waitReach(-30,20,5); player.carrying=null;
  await showDialogue([
    {who:'الطفل', text:'إنت اللي جبتهم يا عمو؟'},
    {who:'سليم', text:'(صمت طويل) …أنا آسف.'},
    {who:'الطفل', text:'ماما قالت اللي يعتذر يبقى طيب.'},
    {who:'سليم (لنفسه)', text:'طيب؟… أنا مش طيب. أنا بس… لسه عايش.'}]);
  addHonor(10,'أنقذت الطفل من تحت الأنقاض'); addRel('marzouq',10);
  await playCutscene('C4');
}},
{ id:'1.6', chapter:1, title:'بعد عشر سنين', steps: async()=>{
  setObjective('الفصل 1 — الواحة','امشِ في سوق أسيوط وقابل الحاج منصور عند القهوة');
  teleportPlayer(-70,48,-1.0); showNPC('mansour',-64,52); showNPC('marzouq',-58,50);
  toast('1924 — بعد عشر سنين… سوق أسيوط',5000);
  await waitReach(-64,52,5);
  await showDialogue([
    {who:'الحاج منصور', text:'إنت مسدسجي… وأنا محتاج مسدسجي. اسمك إيه يا ولد؟'},
    {who:'سليم', text:'سليم… سليم أبو الليل.'},
    {who:'الحاج منصور', text:'أبو الليل… اسم يليق بأولاد الليل. تنضم لينا؟'}],
    [{text:'«عايز عيلة جديدة»', apply:()=>{ S.choices.push('1.6: انضممت للعصابة — عايز عيلة جديدة'); addJournal('انضممت لأولاد الليل — عايز عيلة جديدة تغفر لي.'); }},
     {text:'«عايز أنسى الواحة»', apply:()=>{ S.choices.push('1.6: انضممت للعصابة — عايز أنسى الواحة'); addJournal('انضممت لأولاد الليل — عايز أنسى الواحة.'); }}]);
  setObjective('الفصل 1 — الواحة','اتبع منصور إلى المخيم في الجبل — اركب حصانك (R)');
  horseActor.group.position.set(-66,groundH(-66,54),54);
  await waitReach(120,-80,8); // walk/ride to camp (horse nearby)
  horseActor.group.position.set(118,groundH(118,-78),-78);
  showNPC('mansour',130,-88); showNPC('marzouq',128,-86);
  await showDialogue([
    {who:'الشيخ مرزوق', text:'إنت… من الواحة؟'},
    {who:'سليم', text:'(يلمس خاتمه… صمت)'},
    {who:'الحاج منصور', text:'من الليلة دي، ده مخيمك. خيمتك هناك — نام لما تتعب. النوم بيحفظ كل حاجة.'}]);
  setObjective('الفصل 1 — الواحة','نم في خيمتك (اقترب من الخيمة واضغط تفاعل)');
  S.missionData.slept=false;
  addInteract('sleep1',126,-92,'نم في خيمتك',()=>{ S.missionData.slept=true; toast('😴 نمت… تم الحفظ'); saveGame(); },()=>!S.missionData.slept);
  await waitFor(()=>S.missionData.slept, 600000);
}},
{ id:'2.1', chapter:2, title:'الطريق إلى القافلة', steps: async()=>{
  await playCutscene('C5');
  setObjective('الفصل 2 — العاصفة','اركب مع العصابة إلى نقطة الكمين');
  teleportPlayer(120,-80,2.4); mountHorseNow();
  showNPC('mansour',124,-84); showNPC('salma',126,-82); showNPC('omran',128,-80); showNPC('ramadan',122,-78);
  await showDialogue([
    {who:'الحاج منصور', text:'الضربة دي هتخلّصنا يا أولاد الليل! مرتبات الهجانة كلها… وهنبقى أحرار!'},
    {who:'عمران', text:'(يضحك) أحرار… يا حاج، إحنا أحرار من يوم ما اتولدنا!'},
    {who:'رمضان', text:'يا سليم! أنا هبقى أول واحد يوصل للكمين!'},
    {who:'سليم (لنفسه)', text:'سمعت الجملة دي قبل كده… كتير.'}]);
  await rideAlong([{x:80,z:-40},{x:40,z:10},{x:0,z:60},{x:-20,z:85}]);
  toast('وصلت لنقطة الكمين ✓ — رمضان سبقك؟ (اختياري)');
}},
{ id:'2.2', chapter:2, title:'كمين الرمال', steps: async()=>{
  setObjective('الفصل 2 — العاصفة','نفّذ الكمين: أصِب الحراس واجمع صناديق المرتبات');
  teleportPlayer(-16,80,3.14); player.riding=false;
  showNPC('salma',-24,88);
  await showDialogue([{who:'سلمى', text:'(تقنص حارسًا من بعيد) شفت؟ كده بيتعمل.'}]);
  const g1=spawnEnemy('g1','soldier.glb',0xc8b060,-10,95,'حارس القافلة');
  const g2=spawnEnemy('g2','soldier.glb',0xc8b060,0,98,'حارس القافلة');
  const g3=spawnEnemy('g3','soldier.glb',0xc8b060,8,92,'حارس القافلة');
  const g4=spawnEnemy('g4','soldier.glb',0xc8b060,-2,102,'حارس القافلة');
  await Promise.all([g1,g2,g3,g4].map(e=>e.npc.actor.loaded));
  // civilian drivers who surrender
  spawnCivilian('drv1','casual-man.glb',0xb8a888,-14,96,'سائق جمل');
  spawnCivilian('drv2','casual-man.glb',0xb8a888,4,100,'سائق جمل');
  toast('سلمى قنصت الأول… الباقي عليك — السائقون مدنيون، يرفعون أيديهم!',5000);
  await waitFor(()=>!g1.alive&&!g2.alive&&!g3.alive&&!g4.alive, 600000);
  clearEnemies();
  let crates=0;
  for(let i=0;i<3;i++){ const x=-12+i*8, z=104; const cr={done:false}; addInteract('crate'+i,x,z,'اجمع صندوق المرتبات',()=>{ if(cr.done) return; cr.done=true; crates++; toast('جمعت صندوق مرتبات ('+crates+'/3)'); player.money+=150; updateHUD(); },()=>!cr.done); }
  setMarker(-12,104);
  await waitFor(()=>crates>=3, 300000);
  const driversSpared=(WORLD.civilians||[]).filter(c=>c.alive).length>=2;
  if(driversSpared){ addHonor(10,'أكملت الكمين دون قتل السائقين المدنيين'); S.choices.push('2.2: عفوت عن سائقي القافلة المدنيين'); }
  await showDialogue([{who:'عمران', text:'(يفجّر صخرة لسد الطريق) الطريق اتقفل! الصناديق معانا!'}]);
  await playCutscene('C6');
}},
{ id:'2.3', chapter:2, title:'العاصفة', steps: async()=>{
  setObjective('الفصل 2 — العاصفة','اتبع صوت رمضان في العاصفة وأنقذه');
  startStorm(true);
  showNPC('ramadan',30,60);
  toast('🌪 العاصفة تضرب! الرؤية أمتار… اتبع صوت رمضان',5000);
  await showDialogue([{who:'رمضان', text:'يا سليم! أنا مش شايف حاجة!'}]);
  setMarker(30,60);
  await waitReach(30,60,6);
  await showDialogue([
    {who:'سليم', text:'امسك إيدي… ما تسيبهاش، سامع؟ ما تسيبهاش.'},
    {who:'رمضان', text:'(متشبث بصخرة) مش هسيبها…'}]);
  if(player.riding){ player.riding=false; toast('الحصان يرفض التقدم ويصهل — ترجّلت'); }
  player.carrying='ramadan'; hideNPC('ramadan');
  showNPC('marzouq',70,30);
  setObjective('الفصل 2 — العاصفة','اتبع موال مرزوق إلى المأوى الصخري');
  toast('🎵 مرزوق ينشد موالًا من بعيد… كلما اقتربت ارتفع صوته',5000); mawwal();
  setMarker(70,30);
  await waitReach(70,30,6); player.carrying=null; showNPC('ramadan',72,32);
  startStorm(false);
  addHonor(10,'أنقذت رمضان من العاصفة'); addRel('ramadan',15);
  await showDialogue([{who:'الشيخ مرزوق', text:'يا ليل… يا ليل… الحمد لله على السلامة يا ولاد.'}]);
}},
{ id:'2.4', chapter:2, title:'أثر الهجانة', steps: async()=>{
  setObjective('الفصل 2 — العاصفة','تسلل (C) وتجنب مخاريط رؤية الدورية — راقبها بالمنظار');
  teleportPlayer(40,40,-0.78);
  showNPC('guard1',55,55); showNPC('guard2',58,60); showNPC('fouad',62,68);
  await Promise.all([npcs.guard1,npcs.guard2,npcs.fouad].map(n=>n.actor.loaded));
  npcs.fouadHorse.actor.group.visible=true; npcs.fouadHorse.actor.group.position.set(62,groundH(62,68),68);
  // vision cones (visible)
  const cones=[];
  for(const g of [npcs.guard1, npcs.guard2]){ const cone=new THREE.Mesh(new THREE.ConeGeometry(4,12,16,1,true), new THREE.MeshBasicMaterial({color:0xffcc00, transparent:true, opacity:.18, side:THREE.DoubleSide}));
    cone.rotation.x=Math.PI/2; cone.rotation.z=-Math.PI/2; cone.position.copy(g.actor.group.position); cone.position.y=1; scene.add(cone); cones.push(cone); }
  toast('انحنِ (C) وتحرّك ببطء — المخروط الأصفر هو مجال رؤية الجندي',6000);
  setMarker(62,68);
  await waitFor(()=>spyglassOn, 180000);
  await playCutscene('C7');
  if(spyglassOn) toggleSpyglass();
  for(const c of cones) scene.remove(c);
  // silent beat at old oasis graves
  showNPC('marzouq',4,-2);
  setObjective('الفصل 2 — العاصفة','مرّ بالواحة القديمة مع مرزوق');
  await waitReach(4,-2,6);
  await showDialogue([{who:'الشيخ مرزوق', text:'(يتوقف عند القبور… صمت)'},{who:'سليم', text:'(يلمس خاتمه)'}]);
  // diamond choice
  const ch=await showDialogue([{who:'سليم (لنفسه)', text:'الدورية قدامي… أهاجمها ولا أدعها تمر؟'}],
    [{text:'دع الدورية تمر', apply:()=>{ setFlag('patrol_spared'); S.choices.push('2.4: دعوت دورية الهجانة تمر'); setFlag('informant_seed'); addClue('الهجانة تعرف الطريق ده… حد دلّهم.'); addJournal('راقبت الدورية كاملة دون هجوم — الهجانة تعرف الطريق ده… حد دلّهم.'); }},
     {text:'هاجم الدورية', apply:()=>{ setFlag('patrol_spared',false); S.choices.push('2.4: هاجمت دورية الهجانة'); addHonor(-5,'هاجمت دورية الهجانة'); }}]);
  hideNPC('fouad'); npcs.fouadHorse.actor.group.visible=false; hideNPC('guard1'); hideNPC('guard2');
}},
{ id:'2.5', chapter:2, title:'إنقاذ رمضان — البئر', steps: async()=>{
  setObjective('الفصل 2 — العاصفة','رمضان سقط في بئر جاف! انزل بالحبل وأنقذه');
  teleportPlayer(55,55,-0.78); showNPC('ramadan',60,60); hideNPC('ramadan'); // رمضان في قاع البئر — غير مرئي حتى يُساعَد على الصعود
  await waitReach(60,60,5);
  addInteract('well',60,60,'انزل بالحبل إلى البئر',()=>{ S.missionData.descended=true; toast('نزلت بالحبل إلى البئر…'); player.pos.set(60,0,60); },()=>!S.missionData.descended);
  await waitFor(()=>S.missionData.descended, 120000);
  await showDialogue([
    {who:'رمضان', text:'أنا آسف يا سليم… كنت عايز أبقى زيك.'},
    {who:'سليم', text:'اللي زيّي ما يتمنّاش حد يبقى زيه يا رمضان.'},
    {who:'رمضان', text:'…بس إنت أحسن واحد في العصابة.'},
    {who:'سليم', text:'(صمت، ثم) اشرب. لسه الطريق طويل.'}]);
  if(player.bandages>0){ player.bandages--; toast('🩹 ضمّدت جرح رمضان — أول استخدام للضمادات'); } else { toast('لا ضمادات معك — ضمّدته بقطعة قماش'); }
  addHonor(10,'أنقذت رمضان من البئر'); addRel('ramadan',10);
  setObjective('الفصل 2 — العاصفة','ساعد رمضان على الصعود واحمل الماء');
  addInteract('helpup',60,60,'ساعد رمضان على الصعود',()=>{ showNPC('ramadan',62,62); toast('رمضان طلع من البئر ✓'); },()=>true);
  await waitFor(()=>npcs.ramadan.actor.group.visible, 120000);
  player.carrying='water'; await waitReach(120,-70,10); player.carrying=null;
  toast('وصلت الماء إلى المخيم ✓');
}},
{ id:'2.6', chapter:2, title:'نار المخيم الأول', steps: async()=>{
  setObjective('الفصل 2 — العاصفة','اجمع 3 حطب وأشعل نار المخيم');
  teleportPlayer(120,-80,2.4); campLight.intensity=2.5;
  let wood=0;
  for(let i=0;i<3;i++){ const x=110+i*8, z=-70+i*4; const w={done:false}; addInteract('wood'+i,x,z,'اجمع حطب',()=>{ if(w.done) return; w.done=true; wood++; toast('جمعت حطب ('+wood+'/3)'); },()=>!w.done); }
  await waitFor(()=>wood>=3, 300000);
  let signals=0;
  for(let i=0;i<3;i++){ const x=126+i*4, z=-84; const sg={done:false}; addInteract('signal'+i,x,z,'أشعل إشارة نارية',()=>{ if(sg.done) return; sg.done=true; signals++; const who=['سلمى','عمران','مرزوق'][i]; toast('🔥 إشارة نارية — '+who+' عاد إلى المخيم!'); showNPC(who==='سلمى'?'salma':who==='عمران'?'omran':'marzouq', x+2, z+2); mawwal(); },()=>!sg.done); }
  setMarker(126,-84);
  await waitFor(()=>signals>=3, 300000);
  setObjective('الفصل 2 — العاصفة','اجلس قرب النار وتحدث مع العصابة');
  showNPC('mansour',130,-88); showNPC('salma',128,-86); showNPC('omran',132,-86); showNPC('marzouq',126,-90); showNPC('ramadan',128,-90);
  await showDialogue([
    {who:'سلمى', text:'(تضحك) العاصفة كانت هتاخدنا… بس إحنا أولاد الليل.'},
    {who:'عمران', text:'(يهرش في رقبته) أنا قلت لكم… الخطة ماشية.'},
    {who:'رمضان', text:'يا سليم! أنا هبقى زيك يومًا ما!'},
    {who:'الشيخ مرزوق', text:'الليل طويل… والغروب لسه مجاش.'}]);
  addInteract('ammocrate',124,-86,'خذ ذخيرة من الصندوق',()=>{ player.ammo+=24; updateHUD(); toast('ذخيرة +24 ✓'); },()=>player.ammo<24);
  await playCutscene('C8');
  setObjective('الفصل 2 — العاصفة','نم في خيمتك لإنهاء الفصل');
  S.missionData.slept=false;
  addInteract('sleep2',126,-92,'نم في خيمتك',()=>{ S.missionData.slept=true; toast('😴 نمت… تم الحفظ'); saveGame(); },()=>!S.missionData.slept);
  await waitFor(()=>S.missionData.slept, 600000);
}},
];
function startStorm(on){ $('stormFx').style.display=on?'block':'none'; scene.fog.near=on?8:90; scene.fog.far=on?45:260; setWind(on?.35:.06); if(on) toast('🌪 عاصفة رملية!',4000); }

// mission runner
async function runMission(idx){ const token=++missionToken; const m=MISSIONS[idx]; if(!m) return;
  currentMission=m; S.missionIdx=idx; S.stepIdx=0; saveGame(true);
  try{ await m.steps(); }catch(e){ console.warn('mission error', e); }
  if(token!==missionToken) return; // superseded
  // mission complete
  toast('✓ اكتملت المهمة: '+m.title, 4000); saveGame(true);
  if(m.id==='1.6'){ showRecap(1); return; }
  if(m.id==='2.6'){ showRecap(2); return; }
  runMission(idx+1); }
function showRecap(chapter){
  const isCh1=chapter===1;
  $('recapTitle').textContent=isCh1?'الفصل الأول — الواحة — انتهى':'الفصل الثاني — العاصفة — انتهى';
  $('recapSummary').textContent=isCh1
    ? 'سليم دلّ الهجانة على الواحة ومات فيها أبرياء… وبعد عشر سنين، لقى عيلة جديدة في «أولاد الليل». السؤال المعلق: هل سليم فعلًا تاب، ولا بس هرب من ذنبه؟'
    : 'سرقة القافلة فشلت في العاصفة، والعصابة تشتتت… لكن سليم أنقذ رمضان، ورأى اليوزباشي فؤاد لأول مرة. السؤال المعلق: مين اللي عرف الهجانة مكان القافلة؟';
  $('recapChoices').innerHTML=S.choices.filter(c=>c.startsWith(isCh1?'1.':'2.')).map(c=>'<div class="journal-entry">✔ '+c+'</div>').join('')||'<p>لا اختيارات مسجلة.</p>';
  $('recapStats').textContent='الشرف: '+honorLabel(S.honor)+' ('+S.honor+') • علاقات: مرزوق '+(S.rel.marzouq||50)+'، رمضان '+(S.rel.ramadan||50)+' • الأدلة: '+S.clues.length;
  $('recapScreen').classList.remove('hidden'); $('hud').classList.add('hidden');
  $('recapNext').textContent=isCh1?'الفصل الثاني ▶':'الفصل الثالث — قريبًا (v2)';
  $('recapNext').onclick=()=>{ $('recapScreen').classList.add('hidden'); $('hud').classList.remove('hidden');
    if(isCh1){ S.chapter=2; runMission(6); } else { toast('الفصلان 1 و2 اكتملا — الفصول 3–12 في الإصدارات القادمة. شكرًا للعبك!'); showTitle(); } };
}
function showTitle(){ gameStarted=false; $('titleScreen').classList.remove('hidden'); $('hud').classList.add('hidden'); }

// ---------------- GAME LOOP ----------------
const clock=new THREE.Clock();
let fpsAcc=0, fpsN=0, fpsT=0, qualityLevel=0;
const stormPts=new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({color:0xd8a860, size:.6, transparent:true, opacity:.7}));
{ const N=600, arr=new Float32Array(N*3); for(let i=0;i<N;i++){ arr[i*3]=rand(-40,40); arr[i*3+1]=rand(0,12); arr[i*3+2]=rand(-40,40);} stormPts.geometry.setAttribute('position', new THREE.BufferAttribute(arr,3)); stormPts.visible=false; scene.add(stormPts); }
let hoofTimer=0;
function animate(){ requestAnimationFrame(animate); const rawDt=Math.min(clock.getDelta(),.1); const dt=eagleEye? rawDt*.35 : rawDt;
  const t=clock.elapsedTime;
  if(gameStarted && !paused){
    updatePlayer(dt, rawDt); updateCamera(dt); updateEnemies(dt); updateNPCAnims(dt);
    if(stormPts.visible){ const p=stormPts.geometry.attributes.position; for(let i=0;i<p.count;i++){ let x=p.getX(i)+dt*14; if(x>40)x=-40; p.setX(i,x); } p.needsUpdate=true; stormPts.position.copy(player.pos); }
    if(muzzleFlash>0) muzzleFlash-=rawDt;
    // cutscene camera
    if(cutsceneActive){ const cs=CUTSCENES[cutsceneId]; if(cs){ const sh=cs.shots[csShotIdx]; if(sh){ csShotT+=rawDt; const k=clamp(csShotT/sh.dur,0,1); const e=k*k*(3-2*k);
      camera.position.set(sh.cam[0], sh.cam[1], sh.cam[2]); camera.lookAt(sh.look[0], sh.look[1], sh.look[2]);
      if(k>=1){ csShotIdx++; startShot(); } } } }
    // interact button
    const it=nearestInteract(); const btn=$('interactBtn');
    if(it && !dlgActive && !cutsceneActive){ btn.style.display='block'; btn.textContent=it.label+' (E)'; } else btn.style.display='none';
    // compass to objective
    if(objectiveTarget){ const ang=Math.atan2(objectiveTarget.x-player.pos.x, objectiveTarget.z-player.pos.z); const rel=ang - camYaw; $('compass').style.transform=`translateX(50%) rotate(${-rel}rad)`; $('compass').textContent='➤'; }
    // eagle meter regen
    if(!eagleEye) eagleMeter=clamp(eagleMeter+rawDt*8,0,100);
  }
  // FPS + adaptive quality
  fpsAcc+=rawDt; fpsN++; if(fpsAcc>=1){ const fps=Math.round(fpsN/fpsAcc); $('fps').textContent=fps+' FPS • '+renderer.info.render.calls+' draw • '+Math.round(renderer.info.render.triangles/1000)+'k tris';
    if(settings.quality==='auto' && fps<45 && qualityLevel<2){ qualityLevel++; if(qualityLevel===1) renderer.setPixelRatio(1.25); else { renderer.setPixelRatio(1); renderer.shadowMap.enabled=false; } }
    fpsAcc=0; fpsN=0; }
  updateFarScenery(); // hide far mesa/cliff while the camera is far away (fog hides them anyway)
  renderer.render(scene,camera);
}
function updatePlayer(dt, rawDt){
  if(cutsceneActive||dlgActive){ if(salim.mixer) salim.mixer.update(dt); if(horseActor.mixer) horseActor.mixer.update(dt); return; }
  let ix=0, iz=0;
  if(keys['w']||keys['arrowup']) iz-=1; if(keys['s']||keys['arrowdown']) iz+=1;
  if(keys['a']||keys['arrowleft']) ix-=1; if(keys['d']||keys['arrowright']) ix+=1;
  ix+=joyVec.x; iz+=joyVec.y;
  const len=Math.hypot(ix,iz); if(len>1){ ix/=len; iz/=len; }
  const moving=len>.1;
  const sprint=keys['shift']||false;
  const speed=player.riding? (sprint?16:10) : player.crouched? 2.2 : player.carrying? 3 : (sprint?7:4.5);
  // camera-relative movement (camYaw is camera orbit angle)
  const sin=Math.sin(camYaw), cos=Math.cos(camYaw);
  const mx=(ix*cos + iz*sin), mz=(iz*cos - ix*sin);
  if(moving){ player.pos.x+=mx*speed*dt; player.pos.z+=mz*speed*dt; player.yaw=Math.atan2(mx,mz); collide(player.pos,.8);
    if(player.riding){ hoofTimer-=dt; if(hoofTimer<=0){ hoof(); hoofTimer=sprint?.28:.45; } horseActor.play&&horseActor.play('Gallop'); }
    else salim.play&&salim.play(player.crouched?'Crouch_Fwd_Loop':'Walk');
  } else { if(!player.riding) salim.play&&salim.play('Idle'); }
  player.pos.y=groundH(player.pos.x,player.pos.z);
  salim.group.position.copy(player.pos); salim.group.position.y=player.pos.y; salim.group.rotation.y=player.yaw;
  if(player.riding){ horseActor.group.position.set(player.pos.x, groundH(player.pos.x,player.pos.z), player.pos.z); horseActor.group.rotation.y=player.yaw; salim.group.position.y=player.pos.y+1.35; }
  else { // horse follows / waits nearby
    const hd=dist2d(horseActor.group.position, player.pos);
    if(hd>4 && hd<60){ const dx=(player.pos.x-horseActor.group.position.x)/hd, dz=(player.pos.z-horseActor.group.position.z)/hd;
      horseActor.group.position.x+=dx*5*dt; horseActor.group.position.z+=dz*5*dt; horseActor.group.position.y=groundH(horseActor.group.position.x,horseActor.group.position.z); horseActor.group.rotation.y=Math.atan2(dx,dz); }
  }
  if(salim.mixer) salim.mixer.update(dt); if(horseActor.mixer) horseActor.mixer.update(dt);
  // enemy contact damage (simple)
  for(const e of WORLD.enemies){ if(!e.alive) continue; if(dist2d(player.pos, e.npc.actor.group.position)<1.6){ player.hp-=8*dt; updateHUD(); if(player.hp<=0){ player.hp=100; toast('سقطت! عدت من آخر نقطة تفتيش'); teleportPlayer(S.pos.x,S.pos.z); updateHUD(); } } }
}
const camTarget=new THREE.Vector3();
function updateCamera(dt){
  if(cutsceneActive) return;
  const dist=spyglassOn? 6 : player.riding? 11 : 8.5;
  const cx=player.pos.x + Math.sin(camYaw)*dist*Math.cos(camPitch);
  const cz=player.pos.z + Math.cos(camYaw)*dist*Math.cos(camPitch);
  const cy=player.pos.y + 2.0 + Math.sin(camPitch)*dist*.55;
  camera.position.lerp(new THREE.Vector3(cx, Math.max(cy, groundH(cx,cz)+1.2), cz), .25);
  // look ahead of the player (not at the player's feet) so the crosshair ray stays near chest height
  camTarget.set(player.pos.x - Math.sin(camYaw)*12, player.pos.y+(player.riding?2.6:1.5), player.pos.z - Math.cos(camYaw)*12);
  camera.lookAt(camTarget);
}
function updateEnemies(dt){
  for(const e of WORLD.enemies){ if(!e.alive) continue; const g=e.npc.actor.group;
    // face player, occasionally "shoot" (visual + damage if close)
    g.lookAt(player.pos.x, g.position.y, player.pos.z);
    e._t=(e._t||rand(1,3))-dt;
    if(e._t<=0){ e._t=rand(2.5,4.5); const d=dist2d(player.pos, g.position);
      if(d<28){ blip(180,.06,'square',.08); if(Math.random()<.35){ player.hp=clamp(player.hp-6,0,100); updateHUD(); toast('أصابك رصاص!'); } } }
    if(e.npc.actor.mixer) e.npc.actor.mixer.update(dt);
  }
}
function updateNPCAnims(dt){ for(const k of Object.keys(npcs)){ const a=npcs[k].actor; if(a.mixer) a.mixer.update(dt); } }

// ---------------- START / TITLE ----------------
function startNewGame(){ initAudio(); S=defaultSave(); S.playerName=$('playerName').value.trim()||'سليم أبو الليل';
  $('titleScreen').classList.add('hidden'); $('hud').classList.remove('hidden'); gameStarted=true; updateHUD();
  hideAllNPCs(); playCutscene('C1').then(()=>{ runMission(0); }); }
function continueGame(){ if(!loadSave()){ toast('لا يوجد حفظ سابق'); return; }
  $('playerName').value=S.playerName||'سليم أبو الليل'; initAudio();
  $('titleScreen').classList.add('hidden'); $('hud').classList.remove('hidden'); gameStarted=true;
  teleportPlayer(S.pos.x||-80, S.pos.z||-20, S.yaw||0); player.hp=S.health||100; player.ammo=S.ammo||24; player.bandages=S.bandages||2; player.money=S.money||0;
  updateHUD(); hideAllNPCs(); toast('مرحبًا بعودتك يا '+S.playerName+' — استئناف من المهمة '+(MISSIONS[S.missionIdx]?MISSIONS[S.missionIdx].id:'1.1'));
  runMission(S.missionIdx||0); }
$('newGameBtn').onclick=startNewGame;
$('continueBtn').onclick=continueGame;
$('howBtn').onclick=()=>$('howPanel').classList.remove('hidden');
$('howClose').onclick=()=>$('howPanel').classList.add('hidden');
$('settingsBtn').onclick=()=>$('settingsPanel').classList.remove('hidden');
$('settingsBtn2').onclick=()=>{ $('pausePanel').style.display='none'; paused=false; $('settingsPanel').classList.remove('hidden'); };
$('settingsClose').onclick=()=>{ settings.vol=$('volSlider').value/100; settings.quality=$('qualitySel').value; settings.subSpeed=$('subSpeed').value; saveSettings(); if(masterGain) masterGain.gain.value=settings.vol; $('settingsPanel').classList.add('hidden'); };
$('creditsBtn').onclick=()=>$('creditsPanel').classList.remove('hidden');
$('creditsClose').onclick=()=>$('creditsPanel').classList.add('hidden');
// continue button state
try{ if(localStorage.getItem(SAVE_KEY)) $('continueBtn').disabled=false; else $('continueBtn').disabled=true; }catch(_){ $('continueBtn').disabled=true; }
$('volSlider').value=Math.round(settings.vol*100); $('qualitySel').value=settings.quality; $('subSpeed').value=settings.subSpeed;

// ---------------- INIT ----------------
spawnCast();
buildVillage().then(()=>{ $('loadStatus').textContent='جاهزة — اختر «لعبة جديدة» للبدء.'; $('loadFill').style.width='100%'; }).catch(e=>{ console.warn('village',e); $('loadStatus').textContent='جاهزة (بعض الديكورات لم تُحمّل — اللعب يعمل).'; });
$('loadFill').style.width='60%';
animate();
addEventListener('beforeunload',()=>{ if(gameStarted) saveGame(true); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden && gameStarted) saveGame(true); });
console.log('Red Sunset v1 ready — Three.js r168, offline');

// debug/testing hook (harmless in normal play)
window.__RS={player, get S(){return S}, teleportPlayer, MISSIONS, setFlag, addHonor, advanceOrInteract, shoot, toggleSpyglass, toggleEagle, toggleMount, get mission(){return currentMission}, get cutscene(){return cutsceneActive}, WORLD, THREE, camera, raycaster, scene, renderer, sun, get camYaw(){return camYaw},
  jumpToMission:(i)=>{ missionToken++; hideAllNPCs(); clearEnemies(); clearTargets(); S.missionData={}; runMission(i); }};
