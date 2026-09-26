(() => {
  const root=document.getElementById('av-two-bed-spatial');
  const host=root.querySelector('#av-viewport');
  const detail=root.querySelector('#av-detail');
  const overlay=root.querySelector('#av-labels');
  const view=root.querySelector('#av-view');
  const full=root.querySelector('#av-full');
  const doors=root.querySelector('#av-doors');
  const storage=root.querySelector('#av-storage');
  const cabinet=root.querySelector('#av-cabinet');
  const data=JSON.parse(document.getElementById('av-scene-data').textContent);
  if(!window.THREE || !THREE.OrbitControls || data.pending){window.dispatchEvent(new Event('apartment-viewer-error'));return;}
  const T=THREE;
  const css=getComputedStyle(root);
  const cssColor=(name)=>{const v=css.getPropertyValue(name).trim();const temp=document.createElement('span');temp.style.color=`var(${name})`;root.append(temp);const rgb=getComputedStyle(temp).color;temp.remove();return new T.Color(rgb);};
  const bg=cssColor('--background'), fg=cssColor('--foreground');
  const series1=cssColor('--viz-series-1'), series2=cssColor('--viz-series-2');
  const blend=(a,b,t)=>a.clone().lerp(b,t);
  const colors={wall:blend(bg,fg,.12),floor:blend(bg,series2,.15),window:blend(bg,series1,.30),
    cabinet:blend(bg,fg,.13),wood:blend(bg,series2,.32),linen:blend(bg,series1,.18),
    pillow:blend(bg,fg,.04),accent:blend(bg,series1,.47),seat:blend(bg,series1,.24),
    metal:blend(bg,fg,.46),appliance:blend(bg,fg,.16),screen:blend(bg,fg,bg.getHSL({}).l<.45?.12:.86),
    glass:blend(bg,series1,.25),mirror:blend(bg,series1,.35),light:blend(bg,fg,.02),
    door:blend(bg,series2,.20),worktop:blend(bg,fg,.09),conditional:blend(bg,cssColor('--orange'),.40),
    envelope:cssColor('--viz-series-1')};
  for(const name of ['wall','floor','wood','cabinet','linen','accent','seat','screen'])colors[name]=cssColor('--model-'+name).convertSRGBToLinear();
  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(42,1,.05,100);
  let renderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}
  catch(e){window.dispatchEvent(new Event('apartment-viewer-error'));return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputEncoding=T.sRGBEncoding;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.localClippingEnabled=true;
  renderer.setClearColor(bg,0);
  host.insertBefore(renderer.domElement,overlay);
  const controls=new T.OrbitControls(camera,renderer.domElement);
  controls.enableDamping=!matchMedia('(prefers-reduced-motion: reduce)').matches;controls.dampingFactor=.10;
  controls.maxPolarAngle=Math.PI*.49;controls.minDistance=.5;controls.maxDistance=35;
  controls.target.set(0,.6,0);
  scene.add(new T.HemisphereLight(0xffffff,0x888888,.95));
  const sun=new T.DirectionalLight(0xffffff,.75);sun.position.set(-5,11,-8);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;
  sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.bias=-.0006;
  scene.add(sun);scene.add(new T.AmbientLight(0xffffff,.28));
  const clipping=new T.Plane(new T.Vector3(0,-1,0),.90);
  const materials={};const edgeMaterials=[];
  for(const [k,c] of Object.entries(colors)){
    const glass=k==='glass'||k==='window'||k==='envelope'||k==='conditional';
    materials[k]=new T.MeshStandardMaterial({color:c,roughness:k==='metal'?.42:.78,
      metalness:k==='metal'?.45:0,side:T.DoubleSide,
      transparent:glass,opacity:k==='envelope'?.18:(k==='conditional'?.42:(glass?.24:1)),depthWrite:!glass});
    if(k==='wall'||k==='window') materials[k].clippingPlanes=[clipping];
  }
  const model=new T.Group();scene.add(model);
  const shellGroup=new T.Group();model.add(shellGroup);
  for(const g of data.shell){
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(g.positions,3));
    geo.setIndex(g.indices);geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,materials[g.kind]);mesh.name=g.name;mesh.receiveShadow=true;mesh.castShadow=g.kind!=='floor';
    shellGroup.add(mesh);
  }
  const itemMap=Object.fromEntries(data.items.map(x=>[x.id,x]));
  const itemChoice=root.querySelector('#av-item');
  const hingeMap={};
  for(const h of data.hinges){const g=new T.Group();g.position.fromArray(h.pivot);g.userData.hinge=h;model.add(g);hingeMap[h.id]=g;}
  model.updateMatrixWorld(true);
  for(const h of data.hinges){if(h.parent)hingeMap[h.parent].attach(hingeMap[h.id]);}
  const pickable=[];const partMap={};const envelopeMeshes=[];const sliding=[];
  for(const p of data.parts){
    let geo;
    if(p.shape==='cylinder'){
      geo=new T.CylinderGeometry(.5,.5,1,28);
      geo.scale(p.size[0],p.size[1],p.size[2]);
      if(p.axis==='z')geo.rotateX(Math.PI/2);
    }else geo=new T.BoxGeometry(...p.size);
    const mesh=new T.Mesh(geo,materials[p.material]);mesh.position.fromArray(p.position);
    mesh.name=p.name;mesh.userData.owner=p.owner;mesh.castShadow=p.material!=='glass'&&p.material!=='envelope';mesh.receiveShadow=true;
    model.add(mesh);partMap[p.id]=mesh;
    if(!['glass','envelope','light','conditional'].includes(p.material)){
      const edgeMaterial=new T.LineBasicMaterial({color:blend(bg,fg,.48),transparent:true,opacity:.42});
      edgeMaterials.push(edgeMaterial);mesh.add(new T.LineSegments(new T.EdgesGeometry(geo,30),edgeMaterial));
    }
    if(p.hinge){model.updateMatrixWorld(true);hingeMap[p.hinge].attach(mesh);}
    if(p.defaultHidden){mesh.visible=false;envelopeMeshes.push(mesh);}else pickable.push(mesh);
    if(p.slide)sliding.push({mesh,base:mesh.position.clone(),delta:new T.Vector3(...p.slide),mode:p.slideMode});
  }
  const outline=new T.Box3Helper(new T.Box3(),cssColor('--viz-series-1'));outline.visible=false;scene.add(outline);
  const dimGroup=new T.Group();scene.add(dimGroup);
  const labelItems=[];
  for(const m of data.measurements){
    const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(...m.a),new T.Vector3(...m.b)]);
    const line=new T.Line(geo,new T.LineBasicMaterial({color:m.warning?cssColor('--destructive'):fg,transparent:true,opacity:.75}));dimGroup.add(line);
    const el=document.createElement('span');el.className='measure-label text-small'+(m.warning?' warning':'');el.textContent=`${m.mm} mm`;overlay.append(el);
    labelItems.push({m,line,el,position:new T.Vector3(...m.a).add(new T.Vector3(...m.b)).multiplyScalar(.5)});
  }
  const descriptions={
    whole:'以7层参考模型为基准的原始壳体＋拟定制家具。两张1500×2000床垫；床体1530×2040；柜体外包含门板／五金。',
    master:'主卧：床左440、柜前599、床尾846mm。梳妆位750宽；挂衣柜只剩1050宽，容量未夸大。',
    second:'次卧：床侧754mm、床尾402mm；一侧贴墙，不能把402mm称为宽敞通道。北端铰链为可行条件。',
    kitchen:'家电按安装包络占位；开启后检查操作空间。烟道、燃气、选定型号及检修距离为设计预留。',
    bath:'独立湿区含窗凹位，北侧二折门。排污接口与安装构造为设计预留，非施工下单图。',
    eye:'人眼高度约1650mm；柜体为设计高，原梁、旧吊柜和管井缺少测量，尚未补造。'};
  function applyView(persist=true){
    itemChoice.value='';
    const v=view.value==='eye'?{eye:[3.36,1.65,4.92],target:[1.58,1.18,-1.60]}:data.views[view.value];
    camera.position.fromArray(v.eye);controls.target.fromArray(v.target);controls.update();
    let bounds;
    const room=view.value==='master'?'7':view.value==='second'?'3':view.value==='bath'?'4':null;
    const planes=[];
    if(room){
      const floor=data.shell.find(g=>g.name===`1_RoomGround-${room}`);bounds=new T.Box3();
      for(let j=0;j<floor.positions.length;j+=3)bounds.expandByPoint(new T.Vector3(floor.positions[j],floor.positions[j+1],floor.positions[j+2]));
      bounds.max.y=2.65;bounds.min.y=0;
      const pad=.115;
      planes.push(new T.Plane(new T.Vector3(1,0,0),-bounds.min.x+pad),new T.Plane(new T.Vector3(-1,0,0),bounds.max.x+pad),
        new T.Plane(new T.Vector3(0,0,1),-bounds.min.z+pad),new T.Plane(new T.Vector3(0,0,-1),bounds.max.z+pad));
    }else if(view.value==='kitchen'){
      bounds=new T.Box3(new T.Vector3(-1.2,0,.20),new T.Vector3(3.91,2.7,5.31));
      planes.push(new T.Plane(new T.Vector3(1,0,0),1.2),new T.Plane(new T.Vector3(-1,0,0),3.91),
        new T.Plane(new T.Vector3(0,0,1),-.20),new T.Plane(new T.Vector3(0,0,-1),5.31));
    }
    else bounds=new T.Box3(new T.Vector3(-3.941,0,-4.908),new T.Vector3(3.909,2.65,5.307));
    for(const [name,material] of Object.entries(materials))material.clippingPlanes=(name==='wall'||name==='window')?[...planes,clipping]:planes;
    for(const material of edgeMaterials)material.clippingPlanes=planes;
    if(view.value!=='eye'){
      const center=bounds.getCenter(new T.Vector3());center.y=.75;controls.target.copy(center);
      const corners=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new T.Vector3(x,y,z));
      for(let pass=0;pass<3;pass++){
        camera.lookAt(controls.target);camera.updateMatrixWorld(true);
        const spans=corners.map(p=>p.clone().project(camera));
        const factor=Math.max(...spans.map(p=>Math.max(Math.abs(p.x),Math.abs(p.y))))/.85;
        camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);
      }
      controls.update();
    }
    if(view.value==='eye')full.checked=true;
    clipping.constant=full.checked?3.2:.90;
    detail.textContent=descriptions[view.value];outline.visible=false;
    if(persist)saveState();
  }
  function applyOpening(){
    for(const h of data.hinges){const g=hingeMap[h.id];g.rotation[h.axis]=(h.mode==='storage'?storage.checked:doors.checked)?h.angle:0;}
    for(const m of envelopeMeshes)m.visible=storage.checked;
    for(const s of sliding)s.mesh.position.copy(s.base).addScaledVector(s.delta,s.mode?(cabinet.value===s.mode?1:0):(doors.checked?1:0));
    if(doors.checked)detail.textContent='开启包络已显示：柜门、房门和电器不能按关闭状态算通道；未选五金的轨迹须厂家复核。';
    else detail.textContent=descriptions[view.value];
    outline.visible=false;saveState();
  }
  function saveState(){
    if(window.openai?.setWidgetState)window.openai.setWidgetState({modelContent:{view:view.value,fullHeight:full.checked,doorsOpen:doors.checked,storageOpen:storage.checked,cabinet: cabinet.value},privateContent:null}).catch(()=>{});
  }
  function loadState(state){
    const s=state?.modelContent;if(!s)return;
    if(Object.hasOwn(descriptions,s.view))view.value=s.view;
    full.checked=!!s.fullHeight;doors.checked=!!s.doorsOpen;storage.checked=!!s.storageOpen;
    if(['closed','left','right'].includes(s.cabinet))cabinet.value=s.cabinet;
    applyView(false);
    for(const h of data.hinges)hingeMap[h.id].rotation[h.axis]=(h.mode==='storage'?storage.checked:doors.checked)?h.angle:0;
    for(const m of envelopeMeshes)m.visible=storage.checked;
    for(const s of sliding)s.mesh.position.copy(s.base).addScaledVector(s.delta,s.mode?(cabinet.value===s.mode?1:0):(doors.checked?1:0));
  }
  let userEdited=false;
  const edited=fn=>()=>{userEdited=true;fn();};
  view.addEventListener('change',edited(()=>applyView()));
  full.addEventListener('change',edited(()=>{clipping.constant=full.checked?3.2:.90;saveState();}));
  doors.addEventListener('change',edited(applyOpening));storage.addEventListener('change',edited(applyOpening));
  cabinet.addEventListener('change',edited(applyOpening));
  // Do not replay a late initial host snapshot over a user's newer local edit.
  window.addEventListener('openai:set_globals',e=>{if(!userEdited)loadState(e.detail?.globals?.widgetState);});
  const ray=new T.Raycaster();const pointer=new T.Vector2();let down=null;
  renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
    const b=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);
    ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(pickable,false).find(h=>itemMap[h.object.userData.owner]&&!(h.object.material.clippingPlanes||[]).some(p=>p.distanceToPoint(h.point)<0));
    if(!hit)return;const i=itemMap[hit.object.userData.owner];if(!i)return;
    itemChoice.value=i.id;itemChoice.dispatchEvent(new Event('change'));
  });
  root.addEventListener('apartment-select',event=>{
    const item=itemMap[event.detail];if(!item)return;
    const q=item.bounds;outline.box.set(new T.Vector3(q[0],q[1],q[2]),new T.Vector3(q[3],q[4],q[5]));outline.visible=true;
  });
  root.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.camera;
    if(action==='reset'){applyView();return;}
    const offset=camera.position.clone().sub(controls.target);
    if(action==='left'||action==='right')offset.applyAxisAngle(new T.Vector3(0,1,0),action==='left'?.22:-.22);
    else offset.multiplyScalar(action==='in'?.84:1.19);
    if(offset.length()>=controls.minDistance&&offset.length()<=controls.maxDistance)camera.position.copy(controls.target).add(offset);
    controls.update();
  }));
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  new ResizeObserver(resize).observe(host);window.addEventListener('resize',resize);resize();applyView(false);loadState(window.openai?.widgetState);window.dispatchEvent(new Event('apartment-viewer-ready'));
  function frame(){
    if(!root.isConnected){renderer.dispose();controls.dispose();return;}
    if(host.closest('[hidden]')){requestAnimationFrame(frame);return;}
    controls.update();renderer.render(scene,camera);
    for(const {m,line,el,position} of labelItems){
      const show=view.value===m.view;line.visible=show;el.hidden=!show;
      if(show){
        const a=new T.Vector3(...m.a),b=new T.Vector3(...m.b);
        const openDrawer=m.view==='second'&&m.mm===754&&cabinet.value==='right';
        if(openDrawer){b.x=-1.870;el.textContent='抽屉开：400 mm';}
        else el.textContent=`${m.mm} mm`;
        line.geometry.setFromPoints([a,b]);
        const p=a.add(b).multiplyScalar(.5).project(camera);el.hidden=p.z>1||p.z< -1;
        el.style.left=`${(p.x+1)*host.clientWidth/2}px`;el.style.top=`${(1-p.y)*host.clientHeight/2}px`;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
