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
export const dimensionLines={
  all:[{a:[outer.min[0],5.82],b:[outer.max[0],5.82],text:`最大外宽 ${fmt(outer.width)}m`},
       {a:[4.48,outer.min[2]],b:[4.48,outer.max[2]],text:`最大外长 ${fmt(outer.depth)}m`}],
  '7':[{a:[-2.966,-3.36],b:[.203,-3.36],text:'3.17m'},{a:[-2.7,-3.673],b:[-2.7,-.767],text:'2.91m'}],
  '3':[{a:[-3.821,1.53],b:[-.866,1.53],text:'最大宽 2.96m'},{a:[-3.55,-1.272],b:[-3.55,1.815],text:'最大长 3.09m'}],
  '4':[{a:[-2.308,3.22],b:[.203,3.22],text:'最大宽 2.51m'},{a:[-.1,1.935],b:[-.1,3.509],text:'最大长 1.57m'}],
  '13':[{a:[-1.075,4.9],b:[2.44,4.9],text:'最大宽 3.52m'},{a:[2.15,3.248],b:[2.15,5.187],text:'最大长 1.94m'}],
  '0':[{a:[.323,-3.29],b:[3.789,-3.29],text:'最大宽 3.47m'},{a:[3.789,-4.786],b:[3.789,-3.053],text:'最大进深 1.73m'}],
  '12':[{a:[.323,-1.95],b:[3.789,-1.95],text:'客厅净宽 3.47m'},
        {a:[3.57,-2.933],b:[3.57,5.187],text:'贯通最大长 8.12m'},
        {a:[2.56,4.5],b:[3.789,4.5],text:'入户净宽 1.23m'}]
};
