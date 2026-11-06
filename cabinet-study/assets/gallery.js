(() => {
  'use strict';
  const groups=[
    ['entry','玄关','鞋柜与换鞋座','换鞋座下方保留开放鞋位，右侧双门内分层储鞋。石材随手台下设两只薄抽。','1800 × 350 × 2500（含墙段）'],
    ['media','客餐厅','电视与餐边组合柜','电视区 2350，展示与餐边共 1950。右端上、中、下三层都收圆；下层沿用 R50，上、中层暂按 R50。主吊柜深 350、中层上翻深 300、下柜深 400 mm。','4300 × 400 × 2500'],
    ['kitchen','厨房','转角操作柜','从操作区正对烟机，水盆在右侧。水槽台高于灶台，转角避柱；灶下三扇木门，吊柜及外露封板奶油白。','2480 × 1265 × 2400（转角外包）'],
    ['tower','厨房','电器塔与冰箱排','以高柜替换原低返台；从操作区正对烟机，电器高柜排在左、水盆在右。若与门轨相碰或必须与鞋柜齐端，则不采用这版。','1340 × 648 × 2500（组合占位）'],
    ['arch','过道','拱形展示柜','仅在原框确认可用时放置，不拆墙叠柜。右侧木抽外露，上下玻璃门分别开启。','1240 × 220 × 2500'],
    ['utility','过道','三门杂物柜','原框与墙垛重合，须先确认有可用净空且不挡房门；否则另选柜位。左侧放长物，右侧分六格。','820 × 245 × 2500'],
    ['wardrobe','主卧','双列衣柜','左列长挂配两只独立底抽；右列短挂、叠放和底仓分开，顶柜收纳换季物品。','1750 × 600 × 2500'],
    ['vanity','卫浴','双抽洗面盆柜','两只抽面沿已选效果试用南非柚木，上抽避让排水。抽屉拉出会进入卫生间房门的开启范围，两者应错时开启。','800 × 500 × 850'],
    ['laundry','家政阳台','高低家政柜','机器上方留低位开放格，盆上柜抬高后退。整柜依现场窗扇、柱位、管卡和机器进排水复尺后确定。','1150 × 900 × 2500']
  ];
  const caps={hero:'空间日景',night:'空间夜景',axo:'柜体轴测',open:'柜门与抽屉开启',model:'互动三维模型'};
  const boards={
    entry:'奶油白门抽；南非柚木柜内、洞洞板及换鞋坐面，随手台为石材。',
    media:'电视矮柜可见面及餐边两扇上翻门用南非柚木；餐边其余门抽奶油白，展示列上玻璃、下木门。',
    kitchen:'灶下三门用南非柚木；吊柜门面、外露封板及盆下检修门奶油白。柜内木纹，台面石材。',
    tower:'塔柜门抽与顶柜外露封面奶油白；箱体内侧、承托层板南非柚木。电器外观为占位。',
    arch:'拱框、背面和封闭区门内外奶油白，层板及外露双抽南非柚木；上下玻璃分开。',
    utility:'三扇门内外及外露封板奶油白，柜内与分层板南非柚木。',
    wardrobe:'门板、双底抽面奶油白；柜内、层板及可见木纹为南非柚木。',
    vanity:'双抽面沿已选效果试用南非柚木，台面石材、盆体白色。',
    laundry:'高柜与检修门奶油白，低开放格与柜内南非柚木，清洗台为石材。'
  };
  const finish=id=>{
    const wet=id==='vanity', kitchen=id==='kitchen'||id==='tower', outside=id==='laundry';
    return {wall:wet||kitchen?'奶芙米墙砖 · 750 × 1500 mm':outside?'中性参照面，阳台墙面做法未定':'菱花白乳胶漆 · OW025-4',
      floor:wet?'奶芙米地砖 · 750 × 1500 mm':'蜜杏木纹砖 · 600 × 1200 mm',
      phrase:wet?'奶芙米墙地与木色双抽':kitchen?'奶芙米墙砖与蜜杏木纹地砖':outside?'蜜杏木纹地砖与家政柜':'菱花白墙与蜜杏木纹地砖'};
  };
  const $=s=>document.querySelector(s), choose=$('#choose'), photo=$('#photo'), host=$('#model'), stat=$('#status');
  let id='media',mode='hero',open=false,withRoom=true,serial=0,activeViewer=null,moduleReady;
  groups.forEach(([key,,name],i)=>{
    const b=document.createElement('button'); b.type='button'; b.dataset.id=key;
    const n=document.createElement('span'); n.textContent=String(i+1).padStart(2,'0');
    const title=document.createElement('strong');title.textContent=name;b.append(n,title);
    b.onclick=()=>go(key,mode);$('#index').appendChild(b);
    const o=new Option(name,key);choose.add(o);
  });
  const setStatus=(s='')=>{stat.textContent=s;stat.hidden=!s};
  function loadScript(url){return new Promise((ok,fail)=>{const s=document.createElement('script');s.src=url;s.onload=ok;s.onerror=()=>fail(Error('加载失败'));document.head.appendChild(s)})}
  function prepareViewer(){
    if(!moduleReady)moduleReady=loadScript('assets/three.min.js').then(()=>loadScript('assets/OrbitControls.js')).then(()=>import('./viewer.mjs?v=4')).catch(e=>{moduleReady=null;throw e});
    return moduleReady;
  }
  const models=new Map();
  async function showModel(ticket){
    host.hidden=false;photo.hidden=true;$('#tools').hidden=false;
    setStatus('正在加载三维模型…');
    try {
      const [lib,data]=await Promise.all([prepareViewer(),models.get(id)||fetch('assets/'+id+'.json'+(['media','kitchen'].includes(id)?'?v=4':'')).then(r=>{if(!r.ok)throw Error();return r.json()})]);
      if(ticket!==serial)return;
      models.set(id,data);
      if(!activeViewer)activeViewer=lib.viewer(host.querySelector('canvas'));
      activeViewer.show(data,open,id,withRoom);setStatus();$('#tools').hidden=false;
    } catch(e) {
      if(ticket!==serial)return;
      host.hidden=true;photo.src='assets/'+id+'-axo.webp?v=4';photo.alt='三维加载失败，显示该柜轴测图';photo.hidden=false;$('#tools').hidden=true;
      setStatus('此设备暂时不能显示三维模型，已改为轴测图。');
    }
  }
  function update(){
    const g=groups.find(x=>x[0]===id),ticket=++serial;
    const finishes=finish(id);
    choose.value=id;$('#zone').textContent=g[1];$('#title').textContent=g[2];$('#detail').textContent=g[3];$('#dim').textContent=g[4];$('#mediaWidths').hidden=id!=='media';
    $('#wallFinish').textContent=finishes.wall;$('#floorFinish').textContent=finishes.floor;$('#boardFinish').textContent=boards[id];
    $('#room').textContent=withRoom?'隐藏墙地':'显示墙地';$('#room').setAttribute('aria-pressed',String(withRoom));
    $('#counter').textContent=String(groups.indexOf(g)+1).padStart(2,'0')+' / 09';
    document.querySelectorAll('[data-id]').forEach(b=>b.setAttribute('aria-current',b.dataset.id===id?'true':'false'));
    document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    $('#caption').textContent=g[2]+' / '+caps[mode]+(['hero','night'].includes(mode)?'：'+finishes.phrase:'')+(mode==='night'?'（与日景同机位）':'');$('#original').hidden=mode==='model';$('#tools').hidden=mode!=='model';
    $('#toggle').setAttribute('aria-pressed',String(open));$('#toggle').textContent=open?'关闭柜门':'打开柜门';
    host.hidden=mode!=='model';photo.hidden=mode==='model';
    if(mode==='model'){showModel(ticket);return}
    setStatus();const file='assets/'+id+'-'+mode+'.webp'+(['media','kitchen'].includes(id)||mode==='hero'||mode==='night'?'?v=4':'');$('#original').href=file;photo.alt=$('#caption').textContent;
    photo.onerror=()=>{if(ticket===serial)setStatus('图片加载失败，请重试或切换其他视图。')};photo.src=file;
  }
  function go(key,view){
    if(id!==key||mode!==view)open=false;
    const h=key+'/'+view;if(location.hash.slice(1)===h){update();return}
    location.hash=h;
  }
  function fromHash(){
    const [key,view]=location.hash.slice(1).split('/');
    const next=groups.some(x=>x[0]===key)?key:'media', nextMode=Object.hasOwn(caps,view)?view:'hero';
    if(id!==next||mode!==nextMode)open=false;id=next;mode=nextMode;update();
  }
  choose.onchange=()=>go(choose.value,mode);
  $('#roundDetail').ontoggle=()=>{if($('#roundDetail').open&&!$('#roundPhoto').getAttribute('src'))$('#roundPhoto').src='assets/media-right.webp?v=4'};
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>go(id,b.dataset.mode));
  $('#toggle').onclick=()=>{if(!activeViewer||!models.has(id))return;open=!open;activeViewer.state(open);$('#toggle').setAttribute('aria-pressed',String(open));$('#toggle').textContent=open?'关闭柜门':'打开柜门';$('#caption').textContent=$('#title').textContent+' / '+(open?'开启模型':'闭合模型')};
  $('#room').onclick=()=>{if(!activeViewer||!models.has(id))return;withRoom=!withRoom;activeViewer.background(withRoom);$('#room').textContent=withRoom?'隐藏墙地':'显示墙地';$('#room').setAttribute('aria-pressed',String(withRoom))};
  $('#front').onclick=()=>activeViewer?.front();$('#left').onclick=()=>activeViewer?.rotate(-.25,0);$('#right').onclick=()=>activeViewer?.rotate(.25,0);$('#reset').onclick=()=>activeViewer?.reset();
  window.addEventListener('hashchange',fromHash);fromHash();
})();
