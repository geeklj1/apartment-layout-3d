(() => {
  'use strict';
  const groups=[
    ['media','客餐厅','电视与餐边组合柜','落地矮柜可见面全用木纹。玻璃展示列在中间，餐边石材台面上方保留两扇上翻门。','4300 × 400 × 2500'],
    ['entry','玄关','鞋柜与换鞋座','换鞋座下方保留开放鞋位，右侧双门内分层储鞋。石材随手台下设两只薄抽。','1800 × 350 × 2500（含墙段）'],
    ['wardrobe','主卧','双列衣柜','左列长挂配两只独立底抽；右列短挂、叠放和底仓分开，顶柜收纳换季物品。','1750 × 600 × 2500'],
    ['kitchen','厨房','转角操作柜','台面随转角避开凸出构件。水槽台与灶台分高低，吊柜和烟机分开设置。','2480 × 1265 × 2400（转角外包）'],
    ['tower','厨房','电器塔与冰箱排','洗碗机和微蒸烤分层独立承托，夹层留薄抽。两台设备不直接叠压。','1340 × 648 × 2500（组合占位）'],
    ['arch','过道','拱形展示柜','左侧用四扇门分开上下储物区。右侧两只木抽外露，上下玻璃门分别开启。','1240 × 220 × 2500'],
    ['utility','过道','三门杂物柜','三扇通长平门隐藏收纳。左侧留给长物，右侧用五块层板分成六格。','820 × 245 × 2500'],
    ['vanity','卫浴','双抽洗面盆柜','盆下两只抽屉分别开启。内部避让排水和阀门，不额外增加镜柜。','800 × 500 × 850'],
    ['laundry','家政阳台','高低家政柜','设备上方保留低位开放格，洗手盆上方的柜底抬高、柜面后退，留出弯腰空间。','1150 × 900 × 2500']
  ];
  const caps={hero:'外观效果',axo:'轴测视图',open:'柜门与抽屉开启',model:'三维结构示意'};
  const $=s=>document.querySelector(s), choose=$('#choose'), photo=$('#photo'), host=$('#model'), stat=$('#status');
  let id='media',mode='hero',open=false,serial=0,activeViewer=null,moduleReady;
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
    if(!moduleReady)moduleReady=loadScript('assets/three.min.js').then(()=>loadScript('assets/OrbitControls.js')).then(()=>import('./viewer.mjs')).catch(e=>{moduleReady=null;throw e});
    return moduleReady;
  }
  const models=new Map();
  async function showModel(ticket){
    host.hidden=false;photo.hidden=true;$('#tools').hidden=false;
    setStatus('正在加载三维模型…');
    try {
      const [lib,data]=await Promise.all([prepareViewer(),models.get(id)||fetch('assets/'+id+'.json').then(r=>{if(!r.ok)throw Error();return r.json()})]);
      if(ticket!==serial)return;
      models.set(id,data);
      if(!activeViewer)activeViewer=lib.viewer(host.querySelector('canvas'));
      activeViewer.show(data,open);setStatus();$('#tools').hidden=false;
    } catch(e) {
      if(ticket!==serial)return;
      host.hidden=true;photo.src='assets/'+id+'-axo.webp';photo.alt='三维加载失败，显示该柜轴测图';photo.hidden=false;$('#tools').hidden=true;
      setStatus('此设备暂时不能显示三维模型，已改为轴测图。');
    }
  }
  function update(){
    const g=groups.find(x=>x[0]===id),ticket=++serial;
    choose.value=id;$('#zone').textContent=g[1];$('#title').textContent=g[2];$('#detail').textContent=g[3];$('#dim').textContent=g[4];
    $('#counter').textContent=String(groups.indexOf(g)+1).padStart(2,'0')+' / 09';
    document.querySelectorAll('[data-id]').forEach(b=>b.setAttribute('aria-current',b.dataset.id===id?'true':'false'));
    document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    $('#caption').textContent=g[2]+' / '+caps[mode];$('#original').hidden=mode==='model';$('#tools').hidden=mode!=='model';
    $('#toggle').setAttribute('aria-pressed',String(open));$('#toggle').textContent=open?'关闭柜门':'打开柜门';
    host.hidden=mode!=='model';photo.hidden=mode==='model';
    if(mode==='model'){showModel(ticket);return}
    setStatus();const file='assets/'+id+'-'+mode+'.webp';$('#original').href=file;photo.alt=g[2]+'的'+caps[mode];
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
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>go(id,b.dataset.mode));
  $('#toggle').onclick=()=>{if(!activeViewer||!models.has(id))return;open=!open;activeViewer.state(open);$('#toggle').setAttribute('aria-pressed',String(open));$('#toggle').textContent=open?'关闭柜门':'打开柜门';$('#caption').textContent=$('#title').textContent+' / '+(open?'开启模型':'闭合模型')};
  $('#left').onclick=()=>activeViewer?.rotate(-.25,0);$('#right').onclick=()=>activeViewer?.rotate(.25,0);$('#reset').onclick=()=>activeViewer?.reset();
  window.addEventListener('hashchange',fromHash);fromHash();
})();
