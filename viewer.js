import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { model } from './model.js';
import { measurements, totalArea, withoutMainBalcony, outer, dimensionLines, fmt } from './measurements.js';

const $ = id => document.getElementById(id);
const rooms = {
  '12':{name:'客餐厅',at:[2.02,.08,.5],color:0xe8ded0,metric:'7楼底模 · 客厅段净宽约3.47m',description:'客厅、餐区与入户通道连通。短过道入口的墙垛和门旁柜体，需要按20楼现场重新核对。'},
  '7':{name:'主卧',at:[-1.4,.08,-2.24],color:0xd6c5ad,metric:'7楼底模 · 约3.17 × 2.91m',description:'主卧位于主采光一侧。20楼窗边墙线、飘窗及窗洞大小尚未实测，当前显示7楼原模型。'},
  '3':{name:'次卧',at:[-2.32,.08,.62],color:0xdad0bd,metric:'7楼底模 · 最大外包约2.96 × 3.09m',description:'房间带转折，最大长宽不代表完整矩形。20楼窗角、梁和柜体边界要分开核对。'},
  '4':{name:'卫生间',at:[-1.08,.08,2.76],color:0xc9dce0,metric:'7楼底模 · 最大外包约2.51 × 1.57m',description:'视频可见门朝卧室短过道。干湿分离待20楼净尺寸、排污点和窗位确认后，再放入设计方案。'},
  '13':{name:'餐厨 / 生活阳台',at:[1.1,.08,4.22],color:0xd3d9cf,metric:'7楼底模 · 厨房与生活阳台合并建模',description:'20楼有照片墙及后端玻璃分隔。墙、柜、玻璃的真实边界不能只凭广角定尺寸，此区优先核对。'},
  '0':{name:'主阳台',at:[2.02,.08,-3.87],color:0xc6d8d2,metric:'朝向约西北 · 以用户提供信息为准',description:'保留原模型的弧形轮廓。模型本身没有真北，当前不绘制精确罗盘；窗框与栏板按20楼现场确认。'}
};
const container = $('scene');
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0x000000,0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
container.appendChild(renderer.domElement);
const camera = new THREE.OrthographicCamera(-8,8,8,-8,.1,100);
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping = false;
controls.minPolarAngle = .001;
controls.maxPolarAngle = Math.PI*.47;
controls.minZoom = .6;
controls.maxZoom = 4.5;
controls.rotateSpeed = .65;
controls.zoomSpeed = .85;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
controls.target.set(0,.1,.2);
scene.add(new THREE.HemisphereLight(0xf4f7ff,0x888278,2.5));
const light = new THREE.DirectionalLight(0xfff5df,3.2);
light.position.set(-6,12,5);
light.castShadow = true;
light.shadow.mapSize.set(1024,1024);
Object.assign(light.shadow.camera,{left:-8,right:8,top:9,bottom:-9,near:1,far:35});
light.shadow.bias = -.0005;
light.shadow.normalBias = .04;
scene.add(light);
const fill = new THREE.DirectionalLight(0xdceeff,1.6);fill.position.set(7,7,-6);scene.add(fill);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.13}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.045;ground.receiveShadow=true;scene.add(ground);
const clip = new THREE.Plane(new THREE.Vector3(0,-1,0),.95);
const floorMeshes=[];const clippedMaterials=[];const labels=[];
const floorGroup = new THREE.Group();scene.add(floorGroup);
const wallGroup = new THREE.Group();scene.add(wallGroup);

for(const data of model){
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.position,3));
  geometry.setIndex(data.index);geometry.computeVertexNormals();
  const isFloor=data.name.includes('RoomGround');
  const roomId=isFloor?data.name.split('-').pop():null;
  const isGlass=data.name.includes('window') || /door_(0|12)$/.test(data.name);
  const mat=new THREE.MeshStandardMaterial({color:isFloor?rooms[roomId].color:isGlass?0x9cb9c3:data.name.includes('door')?0xbaa78e:0xf7f6f1,roughness:isFloor?.88:.72,metalness:0,side:THREE.DoubleSide});
  if(!isFloor){mat.clippingPlanes=[clip];mat.clipShadows=true;clippedMaterials.push(mat);}
  if(isGlass){mat.transparent=true;mat.opacity=.38;mat.depthWrite=false;}
  if(data.name.includes('door')&&!isGlass){mat.transparent=true;mat.opacity=.6;}
  const mesh = new THREE.Mesh(geometry,mat);
  mesh.receiveShadow=true;mesh.castShadow=!isGlass;
  if(isFloor){mesh.position.y=.008;mesh.userData.room=roomId;floorMeshes.push(mesh);floorGroup.add(mesh);}else wallGroup.add(mesh);
  const edges=new THREE.EdgesGeometry(geometry,35);
  const edgeMat=new THREE.LineBasicMaterial({color:isFloor?0xb7b6af:0x929ca0,transparent:true,opacity:isFloor?.28:.25,clippingPlanes:isFloor?[]:[clip]});
  const wire=new THREE.LineSegments(edges,edgeMat);mesh.add(wire);
}

// A section edge follows the actual mesh intersections, not an invented footprint.
const section = new THREE.Group();scene.add(section);
const wallData = model.find(m=>m.name==='1-Wall');
const sectionPositions=[];
for(let i=0;i<wallData.index.length;i+=3){
  const points=wallData.index.slice(i,i+3).map(v=>new THREE.Vector3(...wallData.position.slice(v*3,v*3+3)));
  const hits=[];
  for(let j=0;j<3;j++){
    const a=points[j],b=points[(j+1)%3];
    if((a.y-.95)*(b.y-.95)<0)hits.push(a.clone().lerp(b,(.95-a.y)/(b.y-a.y)));
  }
  if(hits.length===2)sectionPositions.push(...hits[0].toArray(),...hits[1].toArray());
}
const sectionLine=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(sectionPositions,3)),new THREE.LineBasicMaterial({color:0x657580,transparent:true,opacity:.55}));
section.add(sectionLine);

for(const [id,room] of Object.entries(rooms)){
  const m=measurements[id];
  const el=document.createElement('span');el.className='room-label';
  el.innerHTML=`<span>${room.name}</span><b>${fmt(m.area)}<small> ㎡</small></b><em>${id==='7'?'':'最大 '}${fmt(m.width)} × ${fmt(m.depth)}m</em>`;
  el.dataset.room=id;$('labels').append(el);
  labels.push({el,point:new THREE.Vector3(...room.at),id});
}
const pendingPoints=[{at:[.43,1.04,3.22],text:'01 待核对'},{at:[-2.7,1.04,-3.66],text:'02 待核对'},{at:[.34,1.04,.78],text:'03 待核对'}];
const pendingGroup=new THREE.Group();scene.add(pendingGroup);
for(const point of pendingPoints){
  const marker=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),new THREE.MeshBasicMaterial({color:0xbd813a}));marker.position.set(...point.at);pendingGroup.add(marker);
  const el=document.createElement('span');el.className='room-label pending';el.textContent=point.text.slice(0,2);$('labels').append(el);
  labels.push({el,point:new THREE.Vector3(...point.at).add(new THREE.Vector3(0,.15,0)),pending:true});
}

let selected='all',mode='plan';
function updateLabels(){
  const {width,height}=container.getBoundingClientRect();
  const occupied=[];
  for(const label of labels){
    const p=label.point.clone().project(camera);
    const x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height-(label.pending?15:0);
    label.el.style.left=x+'px';label.el.style.top=y+'px';
    const show=$('show-labels').checked && (!label.pending||!$('show-dimensions').checked) && p.z<1 && p.z>-1 && x>10&&x<width-10&&y>55&&y<height-58;
    label.el.classList.toggle('selected',label.id===selected);
    if(show){
      const w=label.el.offsetWidth||75;
      const overlaps=occupied.some(o=>Math.abs(x-o.x)<(w+o.w)/2+3&&Math.abs(y-o.y)<52);
      label.el.style.visibility=overlaps&&mode!=='plan'&&label.id!==selected&&!label.pending?'hidden':'visible';
      if(!overlaps)occupied.push({x,y,w});
    }else label.el.style.visibility='hidden';
  }
}
function updateDimensions(){
  const w=container.clientWidth,h=container.clientHeight,overlay=$('dimensions');
  overlay.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const visible=$('show-dimensions').checked;
  const project=([x,z])=>{const p=new THREE.Vector3(x,$('full-walls').checked?2.82:1.02,z).project(camera);return [(p.x*.5+.5)*w,(-p.y*.5+.5)*h];};
  overlay.innerHTML=visible?(dimensionLines[selected]||[]).map(d=>{
    const a=project(d.a),b=project(d.b),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
    if(len<20)return '';
    const nx=-dy/len*5,ny=dx/len*5;
    let angle=Math.atan2(dy,dx)*180/Math.PI;if(angle>90)angle-=180;if(angle<-90)angle+=180;
    return `<g class="dimension"><path d="M${a}L${b}M${a[0]-nx},${a[1]-ny}L${a[0]+nx},${a[1]+ny}M${b[0]-nx},${b[1]-ny}L${b[0]+nx},${b[1]+ny}"/><text text-anchor="middle" transform="translate(${(a[0]+b[0])/2},${(a[1]+b[1])/2}) rotate(${angle})" dy="-6">${d.text}</text></g>`;
  }).join(''):'';
  pendingGroup.visible=!visible;
  const scale=$('scale-bar');scale.hidden=mode!=='plan'||!visible;
  if(!scale.hidden){
    const p0=project([0,0]),p1=project([1,0]),ppm=Math.hypot(p1[0]-p0[0],p1[1]-p0[1]);
    const metres=[.2,.5,1,2,5].find(m=>ppm*m>=55)||5;
    scale.style.width=ppm*metres+'px';
    scale.children[1].textContent=metres/2;scale.children[2].textContent=metres+'m';
  }
}
function render(){renderer.render(scene,camera);updateLabels();updateDimensions();}
controls.addEventListener('change',render);
function fit(){
  const width=container.clientWidth,height=container.clientHeight;
  renderer.setSize(width,height);
  const aspect=width/height;
  const half=Math.max(7.1,5.8/aspect);
  camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();render();
}
function showRoom(id){
  selected=id;
  for(const button of document.querySelectorAll('[data-room]'))if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(button.dataset.room===id));
  for(const mesh of floorMeshes){const room=rooms[mesh.userData.room];mesh.material.color.setHex(mesh.userData.room===id?0xb6cddd:room.color);}
  const room=rooms[id];
  if(room){
    $('room-title').textContent=room.name;$('room-description').textContent=room.description;$('room-metric').textContent=room.metric;$('room-number').textContent='REFERENCE';
    const m=measurements[id];$('area-value').textContent=fmt(m.area);$('area-label').textContent='房间模型地面面积';
    $('room-metric').textContent=`${id==='7'?'室内长宽':'最大外包'} ${fmt(m.width)} × ${fmt(m.depth)}m${id==='12'?' · 客厅段净宽3.47m':''}`;
    const target=new THREE.Vector3(...room.at);target.y=.1;
    const offset=camera.position.clone().sub(controls.target);controls.target.copy(target);camera.position.copy(target).add(offset);camera.zoom=1.65;
  }else{
    $('room-title').textContent='全屋面积';$('room-description').textContent=`不含主阳台约${fmt(withoutMainBalcony)}㎡（仍含生活阳台）。建筑面积与模型地面面积口径不同，不能直接相减计算公摊。`;$('room-metric').textContent=`最大外轮廓 ${fmt(outer.width)} × ${fmt(outer.depth)}m · 异形，不能长×宽算面积`;$('room-number').textContent='7楼参考模型';
    $('area-value').textContent=fmt(totalArea);$('area-label').textContent='模型地面合计 · 含主阳台';
    controls.target.set(.2,.1,.58);camera.zoom=1;
    camera.position.copy(controls.target).add(mode==='plan'?new THREE.Vector3(0,22,.001):new THREE.Vector3(7,15,11));
  }
  camera.updateProjectionMatrix();controls.update();render();
}
function setView(next){
  mode=next;const target=controls.target.clone();
  if(mode==='plan'){$('full-walls').checked=false;clip.constant=.95;section.visible=true;}
  camera.position.copy(target).add(mode==='plan'?new THREE.Vector3(0,22,.001):new THREE.Vector3(7,15,11));
  controls.enableRotate=mode!=='plan';
  controls.mouseButtons.LEFT=mode==='plan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;
  controls.touches.ONE=mode==='plan'?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE;
  $('three-view').setAttribute('aria-pressed',String(mode==='3d'));$('plan-view').setAttribute('aria-pressed',String(mode==='plan'));
  $('gesture-hint').textContent=mode==='plan'?'单指平移 · 双指缩放':'单指旋转 · 双指缩放 / 平移';
  controls.update();render();
}
function zoom(by){camera.zoom=THREE.MathUtils.clamp(camera.zoom*by,.6,4.5);camera.updateProjectionMatrix();render();}
function rotate(by){if(mode==='plan')setView('3d');const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),by);camera.position.copy(controls.target).add(offset);controls.update();render();}
for(const button of document.querySelectorAll('.rooms button'))button.onclick=()=>showRoom(button.dataset.room);
for(const button of document.querySelectorAll('[data-focus]'))button.onclick=()=>{$('details').close();showRoom(button.dataset.focus);};
$('three-view').onclick=()=>setView('3d');$('plan-view').onclick=()=>setView('plan');$('reset').onclick=()=>showRoom('all');
$('zoom-in').onclick=()=>zoom(1.22);$('zoom-out').onclick=()=>zoom(1/1.22);$('rotate-left').onclick=()=>rotate(-Math.PI/8);
$('full-walls').onchange=()=>{clip.constant=$('full-walls').checked?3:.95;section.visible=!$('full-walls').checked;render();};
$('show-labels').onchange=render;$('show-dimensions').onchange=render;
container.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){rotate(-.15);e.preventDefault();}if(e.key==='ArrowRight'){rotate(.15);e.preventDefault();}if(e.key==='+'||e.key==='=')zoom(1.15);if(e.key==='-')zoom(1/1.15);if(e.key==='Home')showRoom('all');});
let pointerStart;
container.addEventListener('pointerdown',e=>{pointerStart=[e.clientX,e.clientY];});
container.addEventListener('pointerup',e=>{
  if(!pointerStart||Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])>6)return;
  const r=container.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
  const hit=ray.intersectObjects(floorMeshes,false)[0];if(hit)showRoom(hit.object.userData.room);
});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('fallback').hidden=false;container.hidden=true;$('labels').hidden=true;$('dimensions').hidden=true;$('scale-bar').hidden=true;$('gesture-hint').textContent='3D暂不可用，已显示尺寸图';});
new ResizeObserver(fit).observe(container);
showRoom('all');setView('plan');fit();$('loading').hidden=true;
// Render only on interaction, keeping idle mobile battery use low.
