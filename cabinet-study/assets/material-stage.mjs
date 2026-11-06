// A local, generic two-plane sample stand; dimensions here never represent the home.
// Cabinet meshes and tile pitches share native millimetres. Each border cell is clipped.
export function materialStage(T,scene,renderer,paint){
  const textures={},materials={};let stage;const load=new T.TextureLoader();
  const cols={paint:0xf3f0ea,neutral:0xdcded9,grout:0xb4afa5,mixing:0xcab99f,naifumi:0xe5e0d8};
  for(const [name,col] of Object.entries(cols))materials[name]=new T.MeshLambertMaterial({color:new T.Color(col).convertSRGBToLinear(),side:T.FrontSide});
  for(const key of ['mixing','naifumi'])textures[key]=load.load('assets/tile-'+key+'.webp',tex=>{
    tex.encoding=T.sRGBEncoding;tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());tex.needsUpdate=true;
    materials[key].map=tex;materials[key].color.setHex(0xffffff);materials[key].needsUpdate=true;paint();
  });
  function build(id,size){
    if(stage){scene.remove(stage);stage.children.forEach(o=>o.geometry.dispose())}
    stage=new T.Group();
    const [w,d,h]=size, wall=(id==='kitchen'||id==='tower'||id==='vanity')?'naifumi':id==='laundry'?'neutral':'paint',
          floor=id==='vanity'?'naifumi':'mixing';
    const xmin=-850,xmax=w+850,back=-21,near=d+1420,top=Math.max(h+310,2150),bottom=-3,joint=2;
    function plane(isWall,x0,x1,b0,b1,offset,material){const vs=[],uvs=[];
      function rect(xa,xb,ba,bb,u0=0,u1=1,v0=0,v1=1){
        // generic A/B sheet coordinates are X,Z on floor and X,Y on wall.
        // Vertex order faces upwards on floor and forwards on back sheet.
        const pts=[[xa,ba,u0,v0],[xb,ba,u1,v0],[xb,bb,u1,v1],[xa,bb,u0,v1]],
              order=isWall?[0,1,2,0,2,3]:[0,2,1,0,3,2];
        for(const i of order){const [x,b,u,v]=pts[i];vs.push(...(isWall?[x,b,offset]:[x,offset,b]));
          // On floors the long plank or slab axis runs across the stand.
          uvs.push(...(isWall?[u,v]:[v,u]));}
      }
      const tile=material==='mixing'||material==='naifumi';
      if(!tile){rect(x0,x1,b0,b1)}
      else{
        const pitchX=isWall?750:(material==='mixing'?1200:1500),
              pitchB=isWall?1500:(material==='mixing'?600:750);
        for(let r=Math.floor(b0/pitchB);r*pitchB<b1;r++){
          const rb=r*pitchB,stagger=material==='mixing'?((r%3+3)%3)*400:0;
          for(let c=Math.floor((x0-stagger)/pitchX);c*pitchX+stagger<x1;c++){
            const cx=c*pitchX+stagger,xa=Math.max(x0,cx+joint/2),xb=Math.min(x1,cx+pitchX-joint/2),ba=Math.max(b0,rb+joint/2),bb=Math.min(b1,rb+pitchB-joint/2);
            if(xa>=xb||ba>=bb)continue;
            let u0=(xa-cx)/pitchX,u1=(xb-cx)/pitchX,v0=(ba-rb)/pitchB,v1=(bb-rb)/pitchB;
            if((c+r)%2){u0=1-u0;u1=1-u1} if(c%2){v0=1-v0;v1=1-v1}
            rect(xa,xb,ba,bb,u0,u1,v0,v1);
          }
        }
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vs,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.computeVertexNormals();
      stage.add(new T.Mesh(geo,materials[material]));
    }
    plane(false,xmin,xmax,back,near,bottom-2,'grout');plane(false,xmin,xmax,back,near,bottom,floor);
    if(wall==='naifumi')plane(true,xmin,xmax,bottom,top,back-2,'grout');
    plane(true,xmin,xmax,bottom,top,back,wall);
    scene.add(stage);
  }
  return {build,set(on){if(stage)stage.visible=on;paint()}};
}
