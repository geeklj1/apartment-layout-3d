import * as T from 'three';
import {GLTFLoader,Reflector} from './assets/addons.js';
export async function createHome(scene,renderer,onProgress){
 const gltf=await new GLTFLoader().loadAsync('./assets/home/home-baked.glb?v=full-final2',e=>onProgress?.(e.loaded,e.total));
 const group=gltf.scene,roof=new T.Group();roof.name='sample-roof';group.add(roof);
 const ceiling=[];let triangles=0,draws=0;
 group.traverse(o=>{if(!o.isMesh)return;draws++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
  if(o.name==='baked_ceiling')ceiling.push(o);
  if(o.name==='bath_mirror'||o.name.startsWith('梳妆镜'))o.visible=false;
  if(o.name.startsWith('baked_')&&!o.material.isMeshBasicMaterial){const old=o.material;o.material=new T.MeshBasicMaterial({map:old.emissiveMap||old.map,side:T.DoubleSide,toneMapped:false});old.dispose();}
  const mats=Array.isArray(o.material)?o.material:[o.material];
  for(const m of mats){m.toneMapped=false;if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   // shortcut: glass uses a lightweight transparent approximation; upgrade for true reflections.
   if(m.transmission>0){const frosted=m.roughness>.2;o.material=new T.MeshBasicMaterial({color:frosted?'#d0d0bb':'#e8ece7',transparent:true,opacity:frosted?.85:.07,depthWrite:false,side:T.DoubleSide,toneMapped:false});m.dispose();}
  }
 });
 for(const o of ceiling)roof.attach(o);
 scene.add(group);
 // Only used by glass / metal; baked MeshBasicMaterial receives no new light.
 scene.add(new T.HemisphereLight('#ffffff','#c5c1b7',1));
 function mirror(w,h,x,y,z,ry,color){const o=new Reflector(new T.PlaneGeometry(w,h),{textureWidth:512,textureHeight:512,clipBias:.003,color,multisample:2});o.position.set(x,y,z);o.rotation.y=ry;group.add(o);return o;}
 const bathMirror=mirror(.42,.75,1.643,1.425,3.80,Math.PI/2,0xeeeeee);
 const vanityMirror=mirror(.55,.65,8.475,1.345,4.11,Math.PI,0xeeeeee);
 const tvReflection=mirror(1.654,.944,7.2,1.05,4.368,0,0x151515);
 const ac=[{name:'客厅',dimensions:[1.08,.33,.249]},{name:'主卧',dimensions:[.855,.328,.219]},{name:'次卧',dimensions:[.855,.328,.219]}];
 return {group,roof,ac,triangles,draws,failedTextures:false,update(camera,bird){const {x,z}=camera.position;bathMirror.visible=!bird&&x<3.5&&z<4.5;vanityMirror.visible=!bird&&x>5.8&&z<4.25;tvReflection.visible=!bird&&x>3.1&&z>4.25;}};
}
