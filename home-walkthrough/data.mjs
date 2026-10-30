// Metres; x follows the plan to the right, z follows the plan downward.
export const height=2.65;
const curve=[];for(let i=0;i<=20;i++){let t=i/20,u=1-t;curve.push([u*u*u*9.04+3*u*u*t*9.57+3*u*t*t*10.1+t*t*t*10.19,u*u*u*4.25+3*u*u*t*4.95+3*u*t*t*6.7+t*t*t*7.85]);}
export const arc=curve;
export const outline=[[0,7.85],[0,2.87],[1.548,2.87],[1.548,1.51],[2.4,1.51],[2.4,1.98],[3.225,1.98],[3.225,0],[6.55,0],[6.55,.935],[9.04,.935],...curve,[0,7.85]];
// Wall segments only; openings remain walkable. Source: current plan, not survey.
export const walls=[[0,2.87,0,6.87],[0,7.85,10.19,7.85],[1.548,1.51,1.548,4.25],[2.4,1.51,2.4,1.98],[2.4,1.98,3.225,1.98],[3.225,0,3.225,3.55],[6.55,0,6.55,.935],[5.805,.935,9.04,.935],[9.04,.935,9.04,1.9],[9.04,3.3,9.04,4.25],[5.805,.935,5.805,3.35],[5.805,4.25,9.04,4.25],[3.225,3.2,4.94,3.2],[5.78,3.2,5.805,3.2],[1.548,4.25,2.51,4.25],[3.2,4.25,3.225,4.25]];
export const rooms={
 living:{name:'客厅',at:[6.35,6.5],target:[7.3,4.6],note:'电视矮柜 · 2匹挂机 · 局部薄边吊顶（暂定）'},
 dining:{name:'餐厅',at:[3.25,6.55],target:[3.8,5.1],note:'圆桌 · 450深石材餐边柜 · 三扇厨房门'},
 kitchen:{name:'厨房',at:[1.16,5.5],target:[.4,4.7],note:'700卡萨帝 · 200留台 · 台面800 / 900'},
 entry:{name:'玄关',at:[1.72,7.48],target:[.8,6.9],note:'600 + 800鞋柜 · 洞洞板兼次净衣'},
 master:{name:'主卧',at:[7.4,3.55],target:[7.6,1.9],note:'1500箱体床 · 900 + 900衣柜 · 1.5匹挂机'},
 second:{name:'次卧',at:[5.15,2.45],target:[4,1.3],note:'1200高床 · 窗边书桌 · 1.5匹挂机'},
 bath:{name:'卫生间',at:[2.7,3.65],target:[2.15,2.45],note:'奶芙米墙地 · 洁具与窗洞为示意'},
 balcony:{name:'阳台',at:[9.05,6.5],target:[9.15,7.5],note:'250工具 + 700盆柜 + 700洗烘 · 机器人'}
};
export const footprint=[
 ['shoe',.12,6.77,1.4,.35],['sideboard',1.8,4.37,1.4,.45],['tv',6,4.37,2.4,.35],['side',4.05,7.38,1.2,.35],['screen',5.25,7.13,.08,.6],['sofa',5.45,6.78,2.65,.95],['wardrobe',5.925,1.1,.55,1.8],['bed',6.93,1.14,1.5,2],['night1',6.49,1.14,.4,.35],['night2',8.47,1.14,.4,.35],['vanity',8.085,3.78,.8,.35],['highbed',3.345,.62,1.2,2],['steps',3.345,2.69,1.2,.5],['desk',4.545,.18,1.2,.5],['deskreturn',5.745,.18,.35,.8],['tools',8.34,7.08,.25,.65],['basin',8.59,7.08,.7,.65],['laundry',9.29,7.03,.7,.7],['kitchenlong',.12,2.98,.6,3.65],['sink',.72,2.98,.8,.6],['washbasin',1.665,3.55,.45,.5],['toilet',2.65,2.12,.4,.65]
];
export function inside(x,z){let b=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const a=outline[i],c=outline[j];if((a[1]>z)!=(c[1]>z)&&x<(c[0]-a[0])*(z-a[1])/(c[1]-a[1])+a[0])b=!b;}return b;}
export function blocked(x,z,boxes,r=.14){if(!inside(x,z)||!inside(x-r,z)||!inside(x+r,z)||!inside(x,z-r)||!inside(x,z+r))return true;return boxes.some(b=>{let dx=x-Math.max(b.x,Math.min(x,b.x+b.w)),dz=z-Math.max(b.z,Math.min(z,b.z+b.d));return dx*dx+dz*dz<r*r;});}
export function getColliders(){const b=footprint.map(([name,x,z,w,d])=>({name,x,z,w,d}));for(const [x,z,xx,zz]of walls)b.push({name:'wall',x:Math.min(x,xx)-.06,z:Math.min(z,zz)-.06,w:Math.abs(xx-x)+.12,d:Math.abs(zz-z)+.12});b.push({name:'table',x:3.68,z:4.94,w:1,d:1});return b;}
