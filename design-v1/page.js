(() => {
  const root=document.getElementById('av-two-bed-spatial');
  const view=root.querySelector('#av-view'),preview=root.querySelector('#av-preview');
  const choice=root.querySelector('#av-item'),detail=root.querySelector('#av-detail');
  const data=JSON.parse(document.getElementById('av-scene-data').textContent);
  const widthAlongZ=new Set(['master-wardrobe','vanity','second-wardrobe','sofa','tv-unit','fridge','oven-tower','sideboard','basin','shoe','ac-master','ac-second','ac-living']);
  const names={whole:'全屋',master:'主卧与梳妆柜',second:'次卧与衣柜',kitchen:'餐厨与家政',bath:'卫生间',eye:'全屋'};
  function updatePreview(){const room=view.value==='eye'?'whole':view.value;preview.src=`images/${room}.png`;preview.alt=`${names[room]}设计V1的静态三维投影`;}
  function mode(value){
    root.querySelector('#av-panel-3d').hidden=value!=='3d';
    root.querySelector('#av-panel-static').hidden=value!=='static';
    root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.mode===value)));
    if(value==='static')updatePreview();else window.dispatchEvent(new Event('resize'));
  }
  root.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>mode(b.dataset.mode)));
  view.addEventListener('change',()=>{updatePreview();choice.value='';});
  for(const item of data.items){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;choice.append(option);}
  choice.addEventListener('change',()=>{
    const item=data.items.find(x=>x.id===choice.value);if(!item)return;
    const d=item.dimensionsMm,along=widthAlongZ.has(item.id);
    const width=along?d[2]:d[0],depth=along?d[0]:d[2];
    const bottom=Math.round(item.bounds[1]*1000),top=Math.round(item.bounds[4]*1000);
    const label=item.id==='shower'?'含窗侧凹位的整体范围':'完成／组合外包';
    detail.textContent=`${item.name}｜${label}：宽${width}×深${depth}×高${d[1]} mm；底标高${bottom}、顶标高${top} mm。${item.detail} ${item.condition}`;
    root.dispatchEvent(new CustomEvent('apartment-select',{detail:item.id}));
  });
  window.addEventListener('apartment-viewer-error',()=>{
    mode('static');root.querySelector('#av-mode-3d').disabled=true;
    root.querySelector('#av-loading').hidden=true;
    detail.textContent='此浏览器未能启用三维显示，已切换静态备览；仍可选择房间和家具尺寸。';
  });
  window.addEventListener('apartment-viewer-ready',()=>{root.querySelector('#av-loading').hidden=true;updatePreview();});
})();
