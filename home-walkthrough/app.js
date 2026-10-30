import * as T from 'three';
import {OrbitControls} from './assets/addons.js';
import {createHome} from './sample-scene.js?v=full-final2';
import {rooms,walls,outline,blocked,getHomeColliders,referenceFiles} from './home-data.mjs?v=full-final3';
const $=id=>document.getElementById(id),view=$('view'),keys=new Set(),held=new Set();
let renderer,home,bird=false,entered=false,high=true,yaw=0,pitch=0,drag=null,joy={x:0,y:0},activeRoom='living';
const boxes=getHomeColliders(),scene=new T.Scene();scene.background=new T.Color('#efeee9');
const camera=new T.PerspectiveCamera(63,innerWidth/innerHeight,.035,70);camera.rotation.order='YXZ';
try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){$('loading').textContent='当前浏览器无法启动WebGL。请用支持硬件加速的Safari、Chrome或Edge重试。';$('start').textContent='三维渲染不可用';throw e;}
renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio,1.5),2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;view.appendChild(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(5,0,4.1);orbit.minDistance=5;orbit.maxDistance=19;orbit.maxPolarAngle=Math.PI*.46;orbit.enablePan=false;orbit.enableDamping=true;orbit.dampingFactor=.09;
orbit.enabled=false;camera.position.set(8.55,1.55,6.3);camera.lookAt(4.4,1.25,6.1);camera.fov=56.4;camera.updateProjectionMatrix();
function setStatus(s){$('status').textContent=s;}
function orient(){camera.rotation.set(pitch,yaw,0,'YXZ');}
function resetInput(){keys.clear();held.clear();joy={x:0,y:0};drag=null;$('stick').style.transform='';}
function go(name){if(!rooms[name])return;const r=rooms[name];camera.fov=name==='render'?56.4:63;camera.updateProjectionMatrix();if(blocked(...r.at,boxes))throw new Error('房间落点被阻挡: '+name);bird=false;orbit.enabled=false;document.body.classList.remove('bird');home.roof.visible=true;camera.position.set(r.at[0],name==='render'?1.55:1.6,r.at[1]);yaw=Math.atan2(-(r.target[0]-r.at[0]),-(r.target[1]-r.at[1]));pitch=name==='render'?Math.atan2(-.3,Math.hypot(4.15,.2)):-.15;orient();activeRoom=name;$('referenceImage').src='assets/home/'+referenceFiles[name]+'.jpg';$('referenceImage').alt=r.name+'同场景离线效果图';$('room').value=name;$('modeName').textContent='精细模型 · 烘焙日光';$('roomName').textContent=r.name;$('roomNote').textContent=r.note;$('overview').setAttribute('aria-pressed','false');$('overview').textContent='全屋俯瞰';resetInput();updateMarker();}
function overview(){bird=true;orbit.enabled=true;home.roof.visible=false;document.body.classList.add('bird');camera.fov=48;camera.updateProjectionMatrix();camera.position.set(9,13,10);orbit.target.set(5,0,4.1);orbit.update();$('modeName').textContent='全屋俯瞰';$('roomName').textContent='全屋当前方案';$('roomNote').textContent='拖动旋转 · 滚轮或双指缩放';$('overview').textContent='返回行走';$('overview').setAttribute('aria-pressed','true');resetInput();}
function enter(){entered=true;document.body.classList.add('entered');$('welcome').hidden=true;go($('room').value);view.focus();}
$('start').onclick=enter;$('room').onchange=()=>{if(!home)return;if(!entered)enter();else go($('room').value);};
$('overview').onclick=()=>{if(!home)return;if(!entered)enter();else if(bird)go(activeRoom);else overview();};
$('quality').onclick=()=>{high=!high;renderer.setPixelRatio(high?Math.min(Math.max(devicePixelRatio,1.5),2):1);resize();$('quality').textContent=high?'高清':'流畅';$('quality').setAttribute('aria-pressed',String(high));};
$('reference').onclick=()=>{resetInput();$('referenceDialog').showModal();};$('closeReference').onclick=()=>$('referenceDialog').close();
$('help').onclick=()=>{resetInput();$('info').showModal();};$('closeInfo').onclick=()=>$('info').close();$('info').addEventListener('close',()=>view.focus());
$('mapToggle').onclick=()=>{const collapsed=document.querySelector('.mapbox').classList.toggle('collapsed');$('mapToggle').textContent=collapsed?'+':'−';$('mapToggle').setAttribute('aria-expanded',String(!collapsed));$('mapToggle').setAttribute('aria-label',collapsed?'展开位置地图':'收起位置地图');};
$('level').onclick=()=>{pitch=0;orient();};
$('ceilingLook').onclick=()=>{if(bird)go(activeRoom);pitch=.5;orient();};
$('clean').onclick=()=>{document.body.classList.toggle('clean');$('clean').textContent=document.body.classList.contains('clean')?'显示界面':'隐藏界面';};
const keyCodes=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
window.addEventListener('keydown',e=>{if(!entered||bird||$('info').open||$('referenceDialog').open||e.ctrlKey||e.metaKey||e.altKey||['SELECT','INPUT','BUTTON'].includes(document.activeElement.tagName))return;if(keyCodes.includes(e.code)){e.preventDefault();keys.add(e.code);}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInput();});
renderer.domElement.addEventListener('pointerdown',e=>{if(bird||!entered)return;view.focus();drag={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||bird)return;yaw-=(e.clientX-drag.x)*.004;pitch=Math.max(-1.1,Math.min(1.1,pitch-(e.clientY-drag.y)*.003));drag.x=e.clientX;drag.y=e.clientY;orient();});
for(const type of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(type,()=>drag=null);
let joyId=null;const joystick=$('joystick');function updateJoy(e){const b=joystick.getBoundingClientRect(),x=e.clientX-b.left-b.width/2,y=e.clientY-b.top-b.height/2;const len=Math.hypot(x,y),f=len>38?38/len:1;joy={x:x*f/38,y:y*f/38};$('stick').style.transform=`translate(${x*f}px,${y*f}px)`;}
joystick.addEventListener('pointerdown',e=>{joyId=e.pointerId;joystick.setPointerCapture(e.pointerId);updateJoy(e);});joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyId)updateJoy(e);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,()=>{joyId=null;joy={x:0,y:0};$('stick').style.transform='';});
for(const b of document.querySelectorAll('[data-move],[data-look]')){const k=b.dataset.move||'look-'+b.dataset.look;b.addEventListener('pointerdown',e=>{held.add(k);b.setPointerCapture(e.pointerId);});for(const t of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(t,()=>held.delete(k));b.addEventListener('click',e=>{if(e.detail===0&&!bird){if(k.startsWith('look')){yaw+=k==='look-left'?.2:-.2;orient();}else step(k==='right'?.14:k==='left'?-.14:0,k==='forward'?.14:k==='back'?-.14:0);}});}
function step(side,forward){const dx=Math.cos(yaw)*side-Math.sin(yaw)*forward,dz=-Math.sin(yaw)*side-Math.cos(yaw)*forward;let x=camera.position.x,z=camera.position.z;if(!blocked(x+dx,z,boxes))camera.position.x=x+dx;if(!blocked(camera.position.x,z+dz,boxes))camera.position.z=z+dz;}
const svgNS='http://www.w3.org/2000/svg';$('mapOutline').setAttribute('d',outline.map(([x,z],i)=>(i?'L':'M')+x*1000+' '+z*1000).join(' ')+'Z');
for(const [x,z,xx,zz]of walls){let l=document.createElementNS(svgNS,'line');Object.entries({x1:x*1000,y1:z*1000,x2:xx*1000,y2:zz*1000}).forEach(([k,v])=>l.setAttribute(k,v));$('mapWalls').append(l);}
for(const [id,r]of Object.entries(rooms)){if(id==='render')continue;let t=document.createElementNS(svgNS,'text');t.textContent=r.name;t.setAttribute('x',r.at[0]*1000);t.setAttribute('y',r.at[1]*1000);$('mapLabels').append(t);}
function updateMarker(){if(bird){$('mapMarker').style.display='none';return;}$('mapMarker').style.display='';$('mapMarker').setAttribute('transform',`translate(${camera.position.x*1000} ${camera.position.z*1000}) rotate(${-yaw*180/Math.PI})`);}
let last=performance.now(),ticks=0,needsRender=true;const lastPosition=new T.Vector3(),lastRotation=new T.Quaternion();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.035);last=now;if(document.hidden)return;if(bird)orbit.update();else if(entered&&!$('info').open&&!$('referenceDialog').open){let f=(keys.has('KeyW')||keys.has('ArrowUp')||held.has('forward')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')||held.has('back')?1:0)-joy.y;let s=(keys.has('KeyD')||held.has('right')?1:0)-(keys.has('KeyA')||held.has('left')?1:0)+joy.x;const mag=Math.max(1,Math.hypot(f,s));step(s/mag*dt*.95,f/mag*dt*.95);yaw+=((keys.has('ArrowLeft')||held.has('look-left')?1:0)-(keys.has('ArrowRight')||held.has('look-right')?1:0))*dt*1.15;orient();}if(++ticks%4===0)updateMarker();if(!$('info').open&&!$('referenceDialog').open&&(needsRender||camera.position.distanceToSquared(lastPosition)>1e-10||1-Math.abs(camera.quaternion.dot(lastRotation))>1e-10)){home?.update?.(camera,bird);renderer.render(scene,camera);lastPosition.copy(camera.position);lastRotation.copy(camera.quaternion);needsRender=false;}}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);needsRender=true;}window.addEventListener('resize',resize);requestAnimationFrame(frame);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();setStatus('图形资源已中断，请刷新页面恢复');});
try{home=await createHome(scene,renderer,(loaded,total)=>{$('loading').textContent=total?'载入精细模型 '+Math.round(loaded/total*100)+'%':'已载入 '+(loaded/1024/1024).toFixed(1)+' MB'});home.roof.visible=true;needsRender=true;$('start').disabled=false;$('start').textContent='进入漫游 →';$('loading').textContent='自由行走，不是固定全景跳点';setStatus('全屋精细漫游 · 预计算日光 · 非施工实测');
 // DOM-visible diagnostics support repeatable verification without hidden browser state inspection.
 document.body.dataset.triangles=String(home.triangles);document.body.dataset.ready='true';document.body.dataset.acCount=String(home.ac.length);document.body.dataset.meshes=String(groupMeshCount(home.group));
}catch(e){$('loading').textContent='模型载入失败，请刷新重试。'+e.message;$('start').textContent='载入失败';console.error(e);}
function groupMeshCount(g){let n=0;g.traverse(o=>{if(o.isMesh)n++;});return n;}
