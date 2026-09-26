import {writeFileSync} from 'node:fs';
import {model} from './model.js';
import {measurements,roomNames,totalArea,withoutMainBalcony,dimensionLines,bayWindow,fmt} from './measurements.js';
const centers={'7':[-1.38,-2.22],'3':[-2.3,.62],'4':[-1.1,2.7],'13':[.95,4.2],'12':[2.1,-.35],'0':[2.03,-3.95]};
const colors={'7':'#e7dfd0','3':'#e9e2d3','4':'#dce9ec','13':'#e4e9de','12':'#f0e9de','0':'#e0ebe4'};
let shapes='',walls='',labels='';
for(const mesh of model.filter(m=>m.name.includes('RoomGround'))){
  const id=mesh.name.split('-').pop();let path='';
  for(let i=0;i<mesh.index.length;i+=3){const v=mesh.index.slice(i,i+3).map(n=>[mesh.position[n*3],mesh.position[n*3+2]]);path+=`M${v[0]}L${v[1]}L${v[2]}Z`;}
  shapes+=`<path d="${path}" fill="${colors[id]}"/>`;
  const [x,z]=centers[id],m=measurements[id];
  labels+=`<text x="${x}" y="${z-.24}" class="name">${roomNames[id]}</text><text x="${x}" y="${z+.12}" class="area">${fmt(m.area)}㎡</text>`;
}
const wall=model.find(m=>m.name==='1-Wall'),p=wall.position;
for(let i=0;i<wall.index.length;i+=3){
  const points=wall.index.slice(i,i+3).map(n=>p.slice(n*3,n*3+3)),hits=[];
  for(let j=0;j<3;j++){const a=points[j],b=points[(j+1)%3];if((a[1]-1.2)*(b[1]-1.2)<0){const f=(1.2-a[1])/(b[1]-a[1]);hits.push([a[0]+f*(b[0]-a[0]),a[2]+f*(b[2]-a[2])]);}}
  if(hits.length===2)walls+=`M${hits[0]}L${hits[1]}`;
}
const dimensions=dimensionLines.all.map(({a,b,text,labelAt,labelDy})=>{
  const vertical=a[0]===b[0],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
  return `<path d="M${a}L${b}M${a[0]-.1},${a[1]-.1}l.2,.2M${b[0]-.1},${b[1]-.1}l.2,.2" class="dim"/>${labelAt?`<path class="dim" d="M${x},${z}L${labelAt}"/>`:''}<text transform="translate(${labelAt||[x,z]}) rotate(${labelAt?0:vertical?-90:0})" y="${labelDy?.015*labelDy:-.12}" class="size">${text}</text>`;
}).join('');
shapes+=`<rect x="${bayWindow.min[0]}" y="${bayWindow.min[2]}" width="${bayWindow.width}" height="${bayWindow.depth}" fill="#65b7c7" stroke="#267f94" stroke-width=".03"/><text x="-1.455" y="-4.12" class="size">主卧窗台示意 · 20楼待实测</text><path d="M-3.85,-1.4h.78" stroke="#267f94" stroke-width=".04" stroke-dasharray=".09,.07"/><text x="-3.48" y="-1.62" class="size">转角窗待测</text>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5.1 -5.85 10.6 13.25" role="img" aria-label="参考户型面积与尺寸图"><style>text{font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;text-anchor:middle;fill:#294457}.name{font-size:.24px}.area{font-size:.34px;font-weight:600}.size{font-size:.22px}.dim{fill:none;stroke:#476377;stroke-width:.016}.note{font-size:.23px;fill:#536a7a}</style><rect x="-5.1" y="-5.85" width="10.6" height="13.25" fill="#f7f9fa"/><text x="0" y="-5.5" class="name">7楼参考模型 · 非20楼实测 · 单位：m / ㎡</text>${shapes}<path d="${walls}" fill="none" stroke="#566b77" stroke-width=".035"/>${dimensions}${labels}<path d="M-3.94 6.45h2m-2-.1v.2m1-.2v.2m1-.2v.2" class="dim"/><text x="-3.94" y="6.8" class="size">0</text><text x="-2.94" y="6.8" class="size">1</text><text x="-1.94" y="6.8" class="size">2m</text><text x="1.7" y="6.46" class="note">模型合计 ${fmt(totalArea)}㎡（含主阳台）</text><text x="1.7" y="6.8" class="note">不含主阳台 ${fmt(withoutMainBalcony)}㎡</text><text x=".2" y="7.15" class="note">异形房间标注最大长宽，不可用长×宽计算地面面积。</text></svg>`;
writeFileSync(new URL('./dimension-plan.svg',import.meta.url),svg);
writeFileSync(new URL('./dimension-plan-no-areas.svg',import.meta.url),svg.replace(/<text\b[^>]*class="area"[^>]*>[^<]*<\/text>/g,''));
console.log('Generated dimension-plan.svg from original mesh triangles.');
