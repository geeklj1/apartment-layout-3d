import {rooms as currentRooms,outline,walls,blocked,getColliders} from './data.mjs?v=layout-r03b';
import {getKitchenDoorColliders} from './kitchen-door.mjs?v=layout-r03b';
export {outline,walls,blocked};
export const rooms={...currentRooms,
 kitchen:{...currentRooms.kitchen,at:[1.20,6.44],target:[.55,4.30]},
 cabinet:{name:'临厨房矮柜',at:[2.85,6.65],target:[2.50,4.55],pitch:-.3,note:'1400×350×850 · 900双门＋500三抽'},
 sideboard:{name:'入户餐边柜',at:[2.85,5.70],target:[4.55,7.50],note:'1400×450×2400 · 餐边柜 → 屏风 → 沙发'},
 door:{name:'厨房门方案',at:[3.25,6.55],target:[1.63,5.25],note:'三扇玻璃 · 向矮柜侧叠收 · 试排'},
 entry:{...currentRooms.entry,at:[2.65,7.4]},
 master:{...currentRooms.master,at:[8.8,3.40],target:[7.1,1.8]},
 bath:{...currentRooms.bath,at:[3.02,3.95],target:[2.05,2.7]},
 second:{...currentRooms.second,at:[5.35,2.50],target:[4.9,.8]},
 balcony:{...currentRooms.balcony,at:[8.6,5.9],target:[9.2,7.5]},
 render:{name:'效果图同机位',at:[8.55,6.3],target:[4.4,6.1],note:'同场景日景 · 与客餐厅效果图对照'}
};
export function getHomeColliders(open=1){const boxes=getColliders().filter(b=>b.name!=='kitchen-glass'&&b.name!=='island');
 // Include the curved back: its local rear extent is 262mm, beyond the seat.
 for(const [x,z,w,d]of [[3.96,5.95,.44,.472],[3.96,4.458,.44,.472],[3.198,5.22,.472,.44],[4.69,5.22,.472,.44]])boxes.push({name:'chair',x,z,w,d});
 boxes.push({name:'second-open-door',x:4.94,z:2.36,w:.035,d:.84});
 boxes.push({name:'master-open-door',x:5.805,z:3.35,w:.9,d:.035});
 boxes.push({name:'shower-glass',x:1.68,z:3.005,w:.77,d:.01});
 boxes.push(...getKitchenDoorColliders(open));
 return boxes;
}
export const referenceFiles={living:'living',dining:'dining',kitchen:'kitchen',door:'door-open',sideboard:'sideboard',cabinet:'entry-cabinet',entry:'living',master:'master',second:'second',bath:'bath',balcony:'balcony',render:'living'};
