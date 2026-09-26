import { model } from './model.js';
export const fmt=value=>(Math.round((value+1e-8)*100)/100).toFixed(2);

// All lengths are metres. Sum original triangle areas before rounding for display.
export function measureMesh(mesh) {
  let area = 0;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i=0;i<mesh.position.length;i+=3) for(let k=0;k<3;k++) {
    min[k]=Math.min(min[k],mesh.position[i+k]); max[k]=Math.max(max[k],mesh.position[i+k]);
  }
  for(let i=0;i<mesh.index.length;i+=3) {
    const [a,b,c]=mesh.index.slice(i,i+3).map(n=>n*3), p=mesh.position;
    area+=Math.abs((p[b]-p[a])*(p[c+2]-p[a+2])-(p[c]-p[a])*(p[b+2]-p[a+2]))/2;
  }
  return {area,min,max,width:max[0]-min[0],depth:max[2]-min[2]};
}
export const measurements=Object.fromEntries(model.filter(m=>m.name.includes('RoomGround')).map(m=>[m.name.split('-').pop(),measureMesh(m)]));
export const totalArea=Object.values(measurements).reduce((sum,m)=>sum+m.area,0);
export const withoutMainBalcony=totalArea-measurements['0'].area;
export const outer=measureMesh(model.find(m=>m.name==='1-Wall'));
export const roomNames={'7':'主卧','3':'次卧','4':'卫生间','12':'客餐厅 / 过道','13':'厨房 / 生活阳台','0':'主阳台'};
const segment=(a,b,options={})=>({a,b,text:fmt(Math.hypot(b[0]-a[0],b[1]-a[1])),...options});
const xChain=(xs,z,room)=>xs.slice(1).map((x,i)=>segment([xs[i],z],[x,z],{room,chain:true}));
const zChain=(zs,x,room)=>zs.slice(1).map((z,i)=>segment([x,zs[i]],[x,z],{room,chain:true}));
// Chains are projections of real boundary turns. They do not add partitions.
export const dimensionLines={
  '7':[segment([-2.966,-3.32],[.203,-3.32],{room:'7'}),segment([-3.23,-3.673],[-3.23,-.767],{room:'7'})],
  '3':[...xChain([-3.821,-3.086,-.866],2.06,'3'),...zChain([-1.272,-.647,1.815],-4.25,'3')],
  '4':[...xChain([-2.308,-1.897,.203],4.04,'4'),...zChain([1.935,2.757,3.509],-2.9,'4')],
  '13':[...xChain([-1.075,.323,2.44],5.52,'13'),...zChain([3.248,3.629,5.187],-2.5,'13')],
  '0':[segment([.323,-3.29],[3.789,-3.29],{room:'0',labelDy:16}),segment([.08,-3.689],[.08,-3.053],{room:'0'}),segment([4.4,-4.786],[4.4,-3.053],{room:'0'})],
  '12':[
    ...zChain([-2.933,-.647,1.815,3.128,5.187],4.4,'12'),
    segment([.323,-1.8],[3.789,-1.8],{room:'12'}),
    segment([-.746,.95],[3.789,.95],{room:'12'}),
    segment([.323,2.3],[3.789,2.3],{room:'12'}),
    segment([2.56,4.35],[3.789,4.35],{room:'12'})]
};
dimensionLines['13'][2].labelAt=[-3.65,3.18];
export const overallDimensions=[
  segment([outer.min[0],5.98],[outer.max[0],5.98],{text:`最大外宽 ${fmt(outer.width)}m`}),
  segment([4.65,outer.min[2]],[4.65,outer.max[2]],{text:`最大外长 ${fmt(outer.depth)}m`})];
dimensionLines.all=['7','3','4','13','0','12'].flatMap(id=>dimensionLines[id]);
export const segmentNotes={
  '7':'主卧净宽3.17m、净长2.91m；窗台单独显示，不与房间尺寸混在一起。',
  '3':'横向转折0.74＋2.22m；纵向0.63＋2.46m。缺角是2.22×0.63m，不是0.74m宽。',
  '4':'横向0.41＋2.10m；纵向0.82＋0.75m。可直接看出卫生间凹角与主体段。',
  '13':'横向1.40＋2.12m；纵向0.38＋1.56m。按边界折点分段，不代表厨房与生活阳台之间有隔墙。',
  '12':'净宽分为3.47、4.54、3.47、1.23m。右侧纵向2.29、2.46、1.31、2.06m，按左边墙线折点投影分段，不代表右墙有隔断。',
  '0':'阳台开口宽3.47m，窄端进深0.64m、宽端1.73m。弧边不拆成几十段短折线。'};
export const bayWindow={...measureMesh(model.find(m=>m.name==='Layer_1-window_7')),name:'主卧飘窗 / 窗台'};
// Window component bounds, not measured usable sill size. Do not add this to floor area.
export const windowDimensions=[
  segment([bayWindow.min[0],-4.27],[bayWindow.max[0],-4.27],{window:true,text:`${fmt(bayWindow.width)}m`}),
  segment([-.49,bayWindow.min[2]],[-.49,bayWindow.max[2]],{window:true,text:`${fmt(bayWindow.depth)}m`})];
