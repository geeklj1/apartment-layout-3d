import {rooms as currentRooms,outline,walls,blocked,getColliders} from './data.mjs?v=door-r02';
import {getKitchenDoorColliders} from './kitchen-door.mjs?v=door-r02';
export {outline,walls,blocked};
export const rooms={...currentRooms,
 kitchen:{...currentRooms.kitchen,at:[1.20,6.44],target:[.55,4.30]},
 cabinet:{name:'入户柜与屏风',at:[3.0,6.75],target:[5.0,7.48],note:'进门先矮柜 → 再屏风 → 沙发'},
 sideboard:{name:'餐边柜',at:[2.85,6.65],target:[2.50,4.55],note:'下柜450深 · 18背板 · 咖啡机与上翻门试排'},
 door:{name:'厨房门方案',at:[3.25,6.55],target:[1.63,5.25],note:'三扇玻璃 · 向餐边柜侧叠收 · 试排'},
 entry:{...currentRooms.entry,at:[2.65,7.4]},
 master:{...currentRooms.master,at:[8.8,3.40],target:[7.1,1.8]},
 bath:{...currentRooms.bath,at:[3.02,3.95],target:[2.05,2.7]},
 second:{...currentRooms.second,at:[5.35,2.50],target:[4.9,.8]},
 balcony:{...currentRooms.balcony,at:[8.6,5.9],target:[9.2,7.5]},
 render:{name:'效果图同机位',at:[8.55,6.3],target:[4.4,6.1],note:'同场景日景 · 与客餐厅效果图对照'}
};
export function getHomeColliders(open=1){const boxes=getColliders().filter(b=>b.name!=='kitchen-glass'&&b.name!=='island');
 for(const [x,z]of [[4.18,6.16],[4.18,4.72],[3.46,5.44],[4.90,5.44]])boxes.push({name:'chair',x:x-.22,z:z-.22,w:.44,d:.44});
 boxes.push({name:'second-open-door',x:4.94,z:2.36,w:.035,d:.84});
 boxes.push({name:'master-open-door',x:5.805,z:3.35,w:.9,d:.035});
 boxes.push({name:'shower-glass',x:1.68,z:3.005,w:.77,d:.01});
 boxes.push(...getKitchenDoorColliders(open));
 return boxes;
}
export const referenceFiles={living:'living',dining:'dining',kitchen:'kitchen',door:'door-open',sideboard:'sideboard',cabinet:'entry-cabinet',entry:'living',master:'master',second:'second',bath:'bath',balcony:'balcony',render:'living'};
