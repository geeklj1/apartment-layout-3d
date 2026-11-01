import * as T from 'three';
import {OrbitControls,GLTFLoader,RoomEnvironment} from './assets/addons.js';

const $=id=>document.getElementById(id);
const metadata={
 overview:['全屋关系','保留厨房与鞋柜背靠背、餐边与电视柜同墙、床侧贴飘窗的最新关系。不放餐桌、餐椅和茶几。',[['同墙组合柜','4300','mm'],['厨房与鞋柜含墙排长','1800','mm'],['两柜顶点斜距','1100','mm'],['鞋柜前至右墙','1140','mm']],'房间错位、墙厚和门间连接尚未实测闭合。层高暂按2650表现，不能据模型下料。'],
 top:['比例与位置','正上方查看全屋关系。横纵坐标共用同一单位，没有为排版分别拉伸。',[['主卧床外框','1550 × 2220','mm'],['通高柜顶','2500','mm'],['组合柜长度','4300','mm'],['模型单位','毫米','']],'俯视图中房间连接仍是示意；阳台平台深1400仅用于展示，不是实测净深。结构2与4的实际高度范围未知。'],
 kitchen:['厨房','连续L形台面，老板G1PMax在下、美的GC5 Pro在上，冰箱与鞋柜背靠背。',[['电器塔外宽 / 净口','636 / 600','mm'],['冰箱净位试留','700','mm'],['灶台 / 水槽台','800 / 900','mm'],['水槽外长','700','mm']],'台面深600与1555端点连接为试排。冰箱完整型号待核；电器承托、散热、开门和给排水需深化。热水器只示候选位置，不封柜，安装未获核准。'],
 entry:['玄关鞋柜','墙体保留，通高洞洞板接换鞋座，再接鞋柜。随手台用石材，最下排保留开放鞋位。',[['墙段 / 座 / 鞋柜','360 + 600 + 840','mm'],['柜深','350','mm'],['柜顶','2500','mm'],['换鞋座完成高','450','mm']],'600与840为当前建议分格。1800含原实心墙；门缝、收口及五金不等于下料尺寸。左侧330洞洞板覆盖墙侧。'],
 living:['客餐厅','餐边柜加长、电视矮柜缩短。电视柜全南非柚木可见面，餐边柜保留奶油白门面和石材操作台。',[['餐边 / 展示 / 电视','2000 + 300 + 2000','mm'],['餐边柜下深','450','mm'],['电视柜深 / 高','350 / 400','mm'],['沙发占位','2650 × 950','mm']],'分格为本轮重排建议。电视与沙发中心错位375mm，未强行居中；空调位置和软装为示意。'],
 master:['主卧','床侧贴飘窗，床头靠实墙；飘窗仅保留原窗台。衣柜沿指定墙面布置。',[['床外框','1550 × 2220','mm'],['衣柜墙长 / 深','1760 / 600','mm'],['床侧至关闭柜面','650','mm，推导'],['飘窗深','780','mm']],'衣柜实际长需在1760内扣门套与收口。650是平面推导，未核准开门、抽屉和人体同时使用。床垫与软装细节为示意。'],
 second:['次卧试排','在新复尺壳体中试放高床、床尾横梯与窗边书桌。家具可继续调整，当前不是定版。',[['上链 / 底边原数','2920 / 2910','mm'],['凸出部分','1080 × 745','mm'],['床板高度试值','1100','mm'],['桌面高度试值','750','mm']],'原尺寸链相差10mm，未平差。高床与书桌重新落位尚未确认；窗长、踏步、扶手、防坠和承重均待核，不按模型施工。'],
 bath:['卫生间','按标图放置左上马桶、右下洗手盆，左下折线表示淋浴隔断研究位置。',[['主区','1790 × 1440','mm'],['侧向伸出','780','mm'],['左侧尺寸链差值','40','mm']],'洁具没有选定产品，外形仅为位置示意。门洞、折线隔断、排水与左侧40差值仍待复尺。'],
 balcony:['阳台家政柜试排','包管到完成顶，正面和侧面连续收口。洗衣机落地、机器人放窄盆下是当前调整建议。',[['家政柜外宽 / 深','1150 / 900','mm，试值'],['洗衣机 / 盆柜列','700 / 450','mm'],['三筒洗衣机','598 × 597 × 850','mm'],['柜顶','随完成顶','']],'阳台平台深1400仅为展示，不可据此认定通道够用。柜顶按2650表现，实际顶高未知。盆下机器人和管线维护仍需确认。']
};
let renderer,model,controls,camera,scene,info,current='overview',walls=false,doorClosed=false,animation=0,failed=false;
const stage=$('stage');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const meshes=[];
const viewButtons=['walls','door','rotate-left','rotate-right','zoom-in','zoom-out','reset'];
viewButtons.forEach(id=>$(id).disabled=true);
function describe(key){
 const [name,description,dimensions,limit]=metadata[key];
 $('room-name').textContent=name;$('room-description').textContent=description;$('room-limit').textContent=limit;
 $('dimensions').replaceChildren(...dimensions.map(([label,value,unit])=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd'),small=document.createElement('small');dt.textContent=label;dd.textContent=value;small.textContent=unit;dd.append(small);div.append(dt,dd);return div;}));
 $('view-title').textContent=key==='overview'?'把平面，放进空间。':name;
 $('view-subtitle').textContent=key==='overview'?'厨房、玄关与全屋家具，在同一比例里查看。':'Blender 同源模型，拖动查看每个方向。';
 $('model-note').textContent=key==='second'?'次卧家具为新壳体试排，高床高度、窗位和安全构造尚待确认。':key==='balcony'?'阳台外框与平台深度仅为展示，不代表已证明通道或安装可行。':'局部尺寸按复尺建模；房间连接与层高仍为示意。';
 $('mode-label').textContent=key==='top'?'正上方俯视':key==='overview'?'全屋轴测':name;
}
describe('overview');
function render(){if(renderer&&!document.hidden)renderer.render(scene,camera);}
function resize(){if(!renderer)return;const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);const s=camera.userData.span||13;camera.left=-s*w/h/2;camera.right=s*w/h/2;camera.top=s/2;camera.bottom=-s/2;camera.updateProjectionMatrix();render();}
function visible(){
 const keep=['overview','top'].includes(current)?null:['kitchen','entry'].includes(current)?['kitchen','entry']:[current];
 for(const m of meshes){const layer=m.userData.layer||'';m.visible=(!keep||keep.includes(m.userData.room))&&(walls||!['wall-high','uncertain-high'].includes(layer));}
 $('walls').textContent=walls?'剖开上半墙体':'显示完整墙体';$('walls').setAttribute('aria-pressed',String(walls));
 $('door').disabled=!['overview','top','kitchen','entry'].includes(current);
 render();
}
function setView(key,instant=false){
 if(!metadata[key])key='overview';
 current=key;$('view').value=key;describe(key);
 if(!info||!camera)return;
 visible();cancelAnimationFrame(animation);
 const v=info.views[key],to=new T.Vector3(v.pos[0],v.pos[2],v.pos[1]),target=new T.Vector3(v.target[0],v.target[2],v.target[1]);
 const bounds=new T.Box3();for(const m of meshes)if(m.visible)bounds.union(new T.Box3().setFromObject(m));
 const centre=bounds.getCenter(new T.Vector3()),offset=to.clone().sub(target);target.copy(centre);to.copy(centre).add(offset);
 const direction=offset.clone().normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize(),up=new T.Vector3().crossVectors(direction,right);
 let extentX=0,extentY=0;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new T.Vector3(x,y,z).sub(target);extentX=Math.max(extentX,Math.abs(p.dot(right)));extentY=Math.max(extentY,Math.abs(p.dot(up)));}
 const from=camera.position.clone(),old=controls.target.clone(),oldSpan=camera.userData.span||13;
 // Portrait fit expands vertically so the whole model remains inside narrow screens.
 const portrait=stage.clientWidth/stage.clientHeight;
 const span=2*Math.max(extentY,extentX/portrait)*1.12;
 function frame(start,time){const t=instant||reduce?1:Math.min(1,(time-start)/450),e=1-Math.pow(1-t,3);camera.position.lerpVectors(from,to,e);controls.target.lerpVectors(old,target,e);camera.zoom=1;camera.userData.span=T.MathUtils.lerp(oldSpan,span,e);controls.update();resize();if(t<1)animation=requestAnimationFrame(n=>frame(start,n));}
 animation=requestAnimationFrame(t=>frame(t,t));
 const hash=key==='overview'?'':`#${key}`;history.replaceState(null,'',location.pathname+location.search+hash);
}
function setDoor(closed){doorClosed=closed;for(const m of meshes){const match=(m.userData.layer||'').match(/^door-(\d)$/);if(match)m.position.x=m.userData.initialX+(closed?Number(match[1])*.760:0);}$('door').textContent=closed?'收拢厨房门':'关闭厨房门';$('door').setAttribute('aria-pressed',String(closed));render();}
function rotate(delta){cancelAnimationFrame(animation);const v=camera.position.clone().sub(controls.target);v.applyAxisAngle(new T.Vector3(0,1,0),delta);camera.position.copy(controls.target).add(v);controls.update();render();}
function zoom(factor){cancelAnimationFrame(animation);camera.zoom=T.MathUtils.clamp(camera.zoom*factor,.4,7);camera.updateProjectionMatrix();render();}
$('view').addEventListener('change',e=>setView(e.target.value));
$('walls').addEventListener('click',()=>{walls=!walls;setView(current);});
$('door').addEventListener('click',()=>setDoor(!doorClosed));
$('rotate-left').addEventListener('click',()=>rotate(-Math.PI/12));$('rotate-right').addEventListener('click',()=>rotate(Math.PI/12));
$('zoom-in').addEventListener('click',()=>zoom(1.2));$('zoom-out').addEventListener('click',()=>zoom(1/1.2));$('reset').addEventListener('click',()=>setView(current));
$('retry').addEventListener('click',()=>location.reload());
stage.addEventListener('keydown',e=>{if(!renderer||e.target!==stage)return;const actions={ArrowLeft:()=>rotate(-Math.PI/12),ArrowRight:()=>rotate(Math.PI/12),'+':()=>zoom(1.2),'=':()=>zoom(1.2),'-':()=>zoom(1/1.2),'0':()=>setView(current)};if(actions[e.key]){e.preventDefault();actions[e.key]();}});
window.addEventListener('hashchange',()=>setView(location.hash.slice(1)||'overview'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(animation);else render();});
async function init(){
 try{
  const response=await fetch('assets/model-info.json');if(!response.ok)throw Error('模型说明加载失败');info=await response.json();
  renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor('#eeede8');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.AgXToneMapping;renderer.toneMappingExposure=1.1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden','true');stage.prepend(renderer.domElement);
  scene=new T.Scene();scene.background=new T.Color('#eeede8');
  camera=new T.OrthographicCamera(-8,8,6,-6,.05,150);camera.position.set(12,11,13);camera.userData.span=13;
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minZoom=.4;controls.maxZoom=7;controls.maxPolarAngle=Math.PI*.49;controls.screenSpacePanning=true;controls.target.set(-.7,.1,2.4);controls.addEventListener('change',render);controls.addEventListener('start',()=>cancelAnimationFrame(animation));
  const pmrem=new T.PMREMGenerator(renderer),env=new RoomEnvironment();scene.environment=pmrem.fromScene(env,.04).texture;env.dispose();pmrem.dispose();scene.environmentIntensity=.55;
  scene.add(new T.HemisphereLight('#ffffff','#9d998b',1.6));
  const sun=new T.DirectionalLight('#fff9eb',3.1);sun.position.set(3,10,-4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.5,far:30});sun.shadow.bias=-.00015;sun.shadow.normalBias=.018;sun.target.position.set(-.5,0,2.5);scene.add(sun,sun.target);
  const fill=new T.DirectionalLight('#eef3ff',1.3);fill.position.set(-7,6,7);scene.add(fill);
  const result=await new GLTFLoader().loadAsync('assets/home.glb',e=>{if(e.total){const n=Math.min(99,Math.round(e.loaded/e.total*100));$('progress').value=n;$('load-text').textContent=`正在载入模型 ${n}%`;}});
  model=result.scene;let tris=0;
  model.traverse(o=>{if(!o.isMesh)return;meshes.push(o);o.castShadow=true;o.receiveShadow=true;o.userData.initialX=o.position.x;tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m.map)m.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());if(m.transparent){m.depthWrite=false;o.castShadow=false;}if(m.name.includes('木纹')||m.name.includes('南非柚木'))m.roughness=.65;}});
  scene.add(model);
  const ground=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.12}));ground.rotation.x=-Math.PI/2;ground.position.y=-.112;ground.receiveShadow=true;scene.add(ground);
  new ResizeObserver(()=>setView(current,true)).observe(stage);resize();
  stage.classList.add('ready');$('loading').hidden=true;viewButtons.forEach(id=>$(id).disabled=false);
  setView(metadata[location.hash.slice(1)]?location.hash.slice(1):current,true);
  window.homeViewer={ready:true,setView,setDoor,getState:()=>({current,walls,doorClosed,triangles:tris,meshes:meshes.length,visible:meshes.filter(m=>m.visible).length,zoom:camera.zoom,camera:camera.position.toArray(),target:controls.target.toArray(),failed})};
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();showFailure('浏览器释放了3D资源。请重新载入，或先查看下方渲染图。');});
 }catch(e){console.error(e);showFailure('当前浏览器或网络未能载入3D。可以查看渲染图，也可以下载模型后用Blender打开。');}
}
function showFailure(message){failed=true;$('loading').hidden=true;$('failure').hidden=false;$('failure-text').textContent=message;stage.classList.remove('ready');viewButtons.forEach(id=>$(id).disabled=true);}
init();
