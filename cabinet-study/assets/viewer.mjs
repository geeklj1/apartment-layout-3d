// Geometry is the cabinet renderer's mesh, expressed as (width, depth, height).
// Convert to right-handed Three.js coordinates with height vertical; use explicit
// two-sided faces for imported meshes of mixed winding.
export function viewer(canvas){
  const T=window.THREE,renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputEncoding=T.sRGBEncoding;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,1,60000),controls=new T.OrbitControls(camera,canvas);
  controls.enablePan=false;controls.minPolarAngle=.06;controls.maxPolarAngle=Math.PI-.10;
  scene.add(new T.HemisphereLight(0xffffff,0xcacbc9,.70));
  for(const [x,y,z,hue,power] of [[-4,5,6,0xfffcf7,.45],[4,3,2,0xf5f7fa,.16]]){
    const lamp=new T.DirectionalLight(hue,power);lamp.position.set(x,y,z);scene.add(lamp)
  }
  const shades={wood:0xb69477,cream:0xece8dc,stone:0xdfd9ce,glass:0xafc9d0,metal:0xa9abad,dark:0x464845,black:0x282a29,white:0xf1ede5,fabric:0xc6b9a3,mirror:0xb9cbcb,wall:0xf3f0ea,tile:0xd7d0bd,floor:0xb49978,light:0xf7d499};
  let g=null,data=null,initial=new T.Vector3(),target=new T.Vector3();
  let grain=null;
  const paint=()=>renderer.render(scene,camera);
  new T.TextureLoader().load('assets/teak-10034y06.webp',tex=>{
    tex.encoding=T.sRGBEncoding;tex.wrapS=tex.wrapT=T.MirroredRepeatWrapping;
    tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());tex.needsUpdate=true;grain=tex;
    g?.traverse(o=>{if(o.material?.name==='wood'){o.material.map=grain;o.material.color.setHex(0xffffff);o.material.needsUpdate=true}});paint()
  });
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();paint()}
  new ResizeObserver(resize).observe(canvas);controls.addEventListener('change',paint);
  function state(open){
    if(!data)return;
    if(g){scene.remove(g);g.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}
    g=new T.Group();const batches={};
    for(const ix of data.s[open?1:0]){
      const [mat,v,faces]=data.p[ix],batch=batches[mat]||(batches[mat]=[]);
      for(const f of faces){
        if(f.length<3)continue;
        let tris=[];
        if(f.length>4){
          const pts=f.map(i=>new T.Vector3(v[3*i],v[3*i+1],v[3*i+2]));
          let normal=new T.Vector3();
          for(let i=1;i<pts.length-1;i++)normal.add(new T.Vector3().subVectors(pts[i],pts[0]).cross(new T.Vector3().subVectors(pts[i+1],pts[0])));
          const a=Math.abs(normal.x),b=Math.abs(normal.y),c=Math.abs(normal.z);
          const flat=pts.map(p=>a>=b&&a>=c?new T.Vector2(p.y,p.z):b>=c?new T.Vector2(p.x,p.z):new T.Vector2(p.x,p.y));
          tris=T.ShapeUtils.triangulateShape(flat,[]).map(t=>t.map(i=>f[i]));
        }else for(let j=1;j<f.length-1;j++)tris.push([f[0],f[j],f[j+1]]);
        for(const tri of tris)for(const i of tri)batch.push(v[3*i],v[3*i+2],v[3*i+1]);
      }
    }
    for(const [mat,pos] of Object.entries(batches)){
      const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(pos,3));geom.computeVertexNormals();
      if(mat==='wood'){
        const uv=[],n=geom.getAttribute('normal').array;
        for(let i=0;i<pos.length;i+=3){
          const [a,b,c]=[Math.abs(n[i]),Math.abs(n[i+1]),Math.abs(n[i+2])];
          // World-space projection: grain runs vertically on doors, along
          // cabinet width on shelves, and down the depth of side panels.
          const x=pos[i],y=pos[i+1],z=pos[i+2];
          uv.push((b>.65?-z:a>c?-z:x)/1200,(b>.65?x:y)/1200);
        }
        geom.setAttribute('uv',new T.Float32BufferAttribute(uv,2))
      }
      const glass=mat==='glass',color=new T.Color(shades[mat]??0xb3afa5).convertSRGBToLinear();
      const material=new T.MeshLambertMaterial({color,side:T.DoubleSide,transparent:glass,opacity:glass?.26:1,depthWrite:!glass});
      material.name=mat;if(mat==='wood'&&grain){material.map=grain;material.color.setHex(0xffffff)}
      const obj=new T.Mesh(geom,material);if(glass)obj.renderOrder=1;g.add(obj);
    }
    scene.add(g);paint();
  }
  function reset(){camera.position.copy(initial);controls.target.copy(target);camera.lookAt(target);controls.update();paint()}
  function show(src,open){data=src;resize();state(open);
    // Frame the union of both actual positions. For hinged doors and tilted
    // cabinets the nominal size alone would crop the open render.
    const bounds=new T.Box3();for(const [,v] of src.p){for(let i=0;i<v.length;i+=3)bounds.expandByPoint(new T.Vector3(v[i],v[i+2],v[i+1]))}
    bounds.getCenter(target);
    const forward=new T.Vector3(.46,.22,1).normalize(),right=new T.Vector3().crossVectors(camera.up,forward).normalize(),up=new T.Vector3().crossVectors(forward,right);
    const tan=Math.tan(T.MathUtils.degToRad(camera.fov)/2),p=new T.Vector3();let range=0;
    for(const [,v] of src.p)for(let i=0;i<v.length;i+=3){
      p.set(v[i],v[i+2],v[i+1]).sub(target);
      range=Math.max(range,p.dot(forward)+Math.max(Math.abs(p.dot(right))/(tan*camera.aspect),Math.abs(p.dot(up))/tan));
    }
    range*=1.17;camera.near=range*.035;camera.far=range*8;camera.updateProjectionMatrix();
    initial.copy(target).addScaledVector(forward,range);
    controls.minDistance=range*.30;controls.maxDistance=range*3;reset();
  }
  function rotate(yaw,pitch){const v=camera.position.clone().sub(controls.target),s=new T.Spherical().setFromVector3(v);
    s.theta+=yaw;s.phi=Math.min(controls.maxPolarAngle,Math.max(controls.minPolarAngle,s.phi+pitch));
    camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();paint()}
  canvas.addEventListener('keydown',e=>{const a={ArrowLeft:[-.18,0],ArrowRight:[.18,0],ArrowUp:[0,-.14],ArrowDown:[0,.14]}[e.key];if(a){e.preventDefault();rotate(...a)}});
  return {show,state,reset,rotate};
}
