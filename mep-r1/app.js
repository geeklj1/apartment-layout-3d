'use strict';
const D=window.MEP_DATA,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],NS='http://www.w3.org/2000/svg';
$('.pdf-link span').textContent=D.sheets.length+'页 PDF';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={system:'power',room:'whole',query:'',status:'all',selected:'E14',labels:true,view:[0,0,900,1100],tab:'plan'};
const toXY=p=>[(p.x+4.4)*100,(p.z+5.15)*100];
$('#base').innerHTML=new DOMParser().parseFromString(D.baseSvg,'image/svg+xml').documentElement.innerHTML;
$('#system').innerHTML='<option value="all">全部专业（用于综合核对）</option>'+Object.entries(D.systems).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');$('#system').value=state.system;
$('#room').innerHTML='<option value="whole">全屋</option>'+Object.entries(D.rooms).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
function filtered(){return D.points.filter(p=>(state.system==='all'||p.system===state.system)&&(state.room==='whole'||p.room===state.room)&&(state.status==='all'||p.status===state.status)&&(!state.query||[p.id,p.name,p.circuit,p.anchor,p.note,D.rooms[p.room]].join(' ').toLowerCase().includes(state.query.toLowerCase())));}
function fit(){state.view=[...(D.crops[state.room]||D.crops.whole)];view();}
function view(){state.view[2]=Math.max(100,Math.min(1800,state.view[2]));state.view[3]=Math.max(120,Math.min(2200,state.view[3]));$('#plan-svg').setAttribute('viewBox',state.view.join(' '));renderMarkers();}
function node(tag,a){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(a))n.setAttribute(k,v);return n;}
function renderMarkers(){const root=$('#markers');root.replaceChildren();const used=[];const unit=state.view[2]/Math.max(300,$('#plan-svg').clientWidth);const labelSize=Math.max(11,Math.min(19,12*unit));
 for(const p of filtered()){const [x,y]=toXY(p),c=D.colors[p.system],selected=p.id===state.selected;
  const g=node('g',{class:'marker'+(selected?' selected':''),'data-id':p.id,role:'button',tabindex:'0','aria-label':`${p.id} ${p.name}，${p.status}`,'aria-pressed':String(selected)});
  g.append(node('circle',{cx:x,cy:y,r:Math.max(12,22*unit),fill:'transparent',class:'hit'}));
  if(selected)g.append(node('circle',{cx:x,cy:y,r:12,class:'ring'}));
  g.append(p.status==='推荐'?node('circle',{cx:x,cy:y,r:5.5,fill:c,stroke:c,class:'glyph'}):node('rect',{x:x-5.5,y:y-5.5,width:11,height:11,fill:'white',stroke:c,class:'glyph'}));
  if(state.labels){let lx=x+11,ly=y-11;for(const [dx,dy]of [[11,-11],[11,23],[-52,-11],[-52,23],[12,-36],[-52,45],[12,48],[-80,-35],[30,67]]){const xx=x+dx,yy=y+dy;if(!used.some(([ux,uy])=>Math.abs(xx-ux)<labelSize*3.5&&Math.abs(yy-uy)<labelSize*1.25)){lx=xx;ly=yy;break;}}used.push([lx,ly]);const t=node('text',{x:lx,y:ly,fill:c,'font-size':labelSize,'pointer-events':'none'});t.textContent=p.id;g.append(t);}
  g.addEventListener('click',()=>{if(!dragged)select(p.id);});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(p.id);}});root.append(g);
 }
}
function schedulePage(p){return D.sheets.find(s=>s.kind==='schedule'&&s.title.startsWith(D.rooms[p.room]))?.page||1;}
function detail(){const p=D.points.find(p=>p.id===state.selected);if(!p){$('#point-detail').innerHTML='<h2>没有匹配点位</h2><p>调整筛选条件或清空查找文字。</p>';return;}
 const c=D.circuits.find(c=>p.circuit.startsWith(c.id));
 $('#point-detail').innerHTML=`<div class="detail-code">${p.id} / ${esc(D.rooms[p.room])}<span class="status ${p.status==='推荐'?'':'caution'}">${p.status}</span></div><h2>${esc(p.name)}</h2><dl><dt>系统</dt><dd>${esc(D.systems[p.system])}</dd><dt>中心标高 / FFL起</dt><dd>${esc(p.height)}${/^[0-9]/.test(p.height)?' mm':''}</dd><dt>定位参照</dt><dd>${esc(p.anchor)}</dd><dt>回路 / 系统</dt><dd>${esc(p.circuit)}${c?`<div class="small">铜线初选 ${esc(c.wire)} mm² · ${esc(c.amp)}</div>`:''}</dd><dt>数量口径</dt><dd>${p.qty} ${p.id==='N02'||p.id==='N03'||p.id==='N04'?'根网线':'组/位'}<div class="small">具体面板或接口配置以备注为准</div></dd><dt>安装与检修条件</dt><dd>${esc(p.note)}</dd></dl><p class="warning">所有位置均为设计意图，尚非现场实测。${p.status==='仅预留'?'仅保留条件，本期不代表通电、接水或采购设备。':'开槽、布盒或接管前须专业复核。'}</p><a href="mep-design-r1.pdf#page=${schedulePage(p)}" target="_blank" rel="noopener">查看本房间 PDF 点位表</a>`;
}
function select(id){state.selected=id;detail();$$('.point-row').forEach(b=>{b.classList.toggle('selected',b.dataset.id===id);b.setAttribute('aria-pressed',String(b.dataset.id===id));});renderMarkers();history.replaceState(null,'',`#point=${encodeURIComponent(id)}`);}
function render(){const ps=filtered();$('#filter-summary').textContent=`${ps.length} / ${D.points.length} 个编号接口组`;$('#drawing-title').textContent=(state.room==='whole'?'全屋':D.rooms[state.room])+' · '+(D.systems[state.system]||'综合点位');
 $('#point-list').innerHTML=ps.length?ps.map(p=>`<button class="point-row ${state.selected===p.id?'selected':''}" data-id="${p.id}" aria-pressed="${state.selected===p.id}"><strong>${p.id}</strong>${esc(p.name)}<small>${esc(D.rooms[p.room])} · ${esc(p.status)}</small></button>`).join(''):'<p class="empty">没有匹配点位，请调整筛选。</p>';
 $$('.point-row').forEach(b=>b.addEventListener('click',()=>select(b.dataset.id)));
 if(!ps.some(p=>p.id===state.selected))state.selected=ps[0]?.id||null;
 detail();renderMarkers();$$('.point-row').forEach(b=>b.classList.toggle('selected',b.dataset.id===state.selected));
}
for(const k of ['system','room','status'])$('#'+k).addEventListener('change',e=>{state[k]=e.target.value;if(k==='room')fit();render();});
$('#query').addEventListener('input',e=>{state.query=e.target.value;render();});$('#clear-filters').addEventListener('click',()=>{Object.assign(state,{system:'power',room:'whole',query:'',status:'all',selected:'E14'});for(const k of ['system','room','query','status'])$('#'+k).value=state[k];fit();render();});
$('#labels').addEventListener('click',()=>{state.labels=!state.labels;$('#labels').textContent='编号'+(state.labels?'开':'关');$('#labels').setAttribute('aria-pressed',String(state.labels));renderMarkers();});
function zoom(f){const [x,y,w,h]=state.view;state.view=[x+w*(1-f)/2,y+h*(1-f)/2,w*f,h*f];view();}
$('#zoom-in').onclick=()=>zoom(.8);$('#zoom-out').onclick=()=>zoom(1.25);$('#fit').onclick=fit;
for(const [k,dx,dy]of [['left',-.15,0],['right',.15,0],['up',0,-.15],['down',0,.15]])$('#pan-'+k).onclick=()=>{state.view[0]+=state.view[2]*dx;state.view[1]+=state.view[3]*dy;view();};
let pointers=new Map(),gesture=null,dragged=false;
const svg=$('#plan-svg');
function gstate(){const a=[...pointers.values()];return{mid:a.length>1?[(a[0].x+a[1].x)/2,(a[0].y+a[1].y)/2]:[a[0].x,a[0].y],dist:a.length>1?Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y):0};}
svg.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=gstate();dragged=false;svg.setPointerCapture(e.pointerId);});
svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const before=gesture;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=gstate();const dx=gesture.mid[0]-before.mid[0],dy=gesture.mid[1]-before.mid[1];if(Math.abs(dx)+Math.abs(dy)>2||pointers.size>1)dragged=true;const ratio=Math.max(state.view[2]/svg.clientWidth,state.view[3]/svg.clientHeight);state.view[0]-=dx*ratio;state.view[1]-=dy*ratio;if(pointers.size>1&&before.dist>0){const f=Math.max(.8,Math.min(1.25,before.dist/gesture.dist));const [x,y,w,h]=state.view;state.view=[x+w*(1-f)/2,y+h*(1-f)/2,w*f,h*f];}view();});
function endPointer(e){const moved=dragged;pointers.delete(e.pointerId);gesture=pointers.size?gstate():null;if(!moved){const matrix=svg.getScreenCTM();let nearest=null,distance=24;for(const p of filtered()){const [x,y]=toXY(p);const screen=new DOMPoint(x,y).matrixTransform(matrix);const d=Math.hypot(screen.x-e.clientX,screen.y-e.clientY);if(d<distance){distance=d;nearest=p;}}if(nearest)select(nearest.id);}if(!pointers.size)setTimeout(()=>{dragged=false;},50);}
svg.addEventListener('pointerup',endPointer);svg.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=pointers.size?gstate():null;});
svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.1:.9);},{passive:false});
function showTab(id){state.tab=id;$$('.tab').forEach(b=>{b.classList.toggle('active',b.dataset.tab===id);b.setAttribute('aria-pressed',String(b.dataset.tab===id));});$$('.tab-panel').forEach(p=>p.hidden=p.id!=='tab-'+id);if(id==='plan')view();}
$$('.tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$('#circuits').innerHTML=D.circuits.map(c=>`<tr><td><button class="circuit-link" data-circuit="${c.id}">${c.id}</button></td><td>${esc(c.name)}</td><td>${c.kw}</td><td>${esc(c.wire)}</td><td>${esc(c.amp)}</td><td>${esc(c.note)}</td></tr>`).join('');
$$('.circuit-link').forEach(b=>b.onclick=()=>{state.system='all';state.room='whole';state.status='all';state.query=b.dataset.circuit;for(const k of ['system','room','status','query'])$('#'+k).value=state[k];showTab('plan');fit();render();});
let loads={...D.scenarios[0].loads};$('#scenario').innerHTML=D.scenarios.map((s,i)=>`<option value="${i}">${esc(s.name)}</option>`).join('')+'<option value="custom">自定义试算</option>';
function loadInputs(){$('#load-inputs').innerHTML=D.circuits.filter(c=>c.status!=='仅预留').map(c=>`<label>${c.id} ${esc(c.name)}<input aria-label="${c.id} 同时负荷 kW" type="number" min="0" max="10" step="0.05" value="${loads[c.id]||0}" data-load="${c.id}"></label>`).join('');$$('[data-load]').forEach(i=>i.oninput=()=>{loads[i.dataset.load]=Math.max(0,Math.min(10,Number(i.value)||0));$('#scenario').value='custom';loadResult();});loadResult();}
function loadResult(){const kw=Object.values(loads).reduce((a,b)=>a+b,0),amps=kw*1000/220/.95,approved=Number($('#supply').value),max=approved*220*.95/1000,manage=max*.85;let message='入户容量未核实，不能据此决定总开关或进线。';if(approved)message=kw>max?'超过该容量情景：必须削减同时负荷，不得靠扩大空开解决。':kw>manage?'接近该容量情景上限：缺乏15%管理余量，建议错峰。':'在该情景管理参考线以内；仍需实际铭牌及供电条件核验。';$('#load-result').innerHTML=`<p class="number">${kw.toFixed(2)}<span class="unit">kW</span></p><p>估算电流 <strong>${amps.toFixed(1)} A</strong></p>${approved?`<p class="small">该容量情景约 ${max.toFixed(2)} kW<br>85%管理参考线 ${manage.toFixed(2)} kW</p>`:''}<p class="warning">${message}</p>`;}
$('#scenario').onchange=e=>{if(e.target.value==='custom')return;loads={...D.scenarios[Number(e.target.value)].loads};loadInputs();};$('#supply').onchange=loadResult;
const noteHTML=ids=>ids.map(i=>`<details><summary>${esc(D.notes[i][0])}</summary>${D.notes[i][1].map(t=>`<p>${esc(t)}</p>`).join('')}</details>`).join('');$('#power-notes').innerHTML=noteHTML([1,2,3,8]);$('#system-notes').innerHTML=noteHTML([4,5,6,7,8]);
let checked={};try{checked=JSON.parse(localStorage.getItem('mep-review-r1')||'{}');}catch{}
function checkList(rows,id,isGate){$(id).innerHTML=rows.map(r=>`<label class="check-row"><input type="checkbox" data-check="${r[0]}" ${checked[r[0]]?'checked':''}><span><strong>${r[0]} · ${esc(r[1])}</strong>${esc(r[2])}<small>${isGate?'责任：'+esc(r[3])+' · '+esc(r[4]):'交付记录：'+esc(r[3])}</small></span></label>`).join('');}
checkList(D.gates,'#gates',true);checkList(D.acceptance,'#acceptance',false);
function countReview(){$('#review-count').textContent=`本机已勾选 ${Object.values(checked).filter(Boolean).length} / ${D.gates.length+D.acceptance.length} 项（非工程验收结论）`;}
$$('[data-check]').forEach(c=>c.onchange=()=>{checked[c.dataset.check]=c.checked;try{localStorage.setItem('mep-review-r1',JSON.stringify(checked));}catch{}countReview();});
$('#export-review').onclick=()=>{const blob=new Blob([JSON.stringify({version:D.version,exportedAt:new Date().toISOString(),meaning:'本机备忘，不等于签字许可',checked},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='水电会审本机核对记录-R1.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('#book-index').innerHTML=D.sheets.map(s=>`<tr><td>${s.code}</td><td><a href="mep-design-r1.pdf#page=${s.page}" target="_blank" rel="noopener">${esc(s.title)}</a></td><td>${s.page}</td></tr>`).join('');
$('#sources').innerHTML=D.sources.map(([id,title,body,url])=>`<details><summary>${id} · ${esc(title)}</summary><p>${esc(body)}</p><p>${url.startsWith('http')?`<a href="${esc(url)}" target="_blank" rel="noopener">原始来源</a>`:esc(url)}</p></details>`).join('')+'<p class="warning">住建部部分原页面和凯度链接本次未成功在线读取；设备条件沿既有本地官方资料。本册没有声称完成现行标准逐条审图。</p>';
const initialId=new URLSearchParams(location.hash.slice(1)).get('point');if(initialId){const q=D.points.find(p=>p.id===initialId);if(q){Object.assign(state,{selected:q.id,system:q.system,room:q.room});$('#system').value=q.system;$('#room').value=q.room;}}
render();fit();loadInputs();countReview();window.addEventListener('resize',()=>{if(state.tab==='plan')renderMarkers();});
window.mepApp={state,getFiltered:filtered,selectPoint:select,showTab};
