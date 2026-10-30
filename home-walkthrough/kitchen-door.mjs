import config from './kitchen-door-config.mjs?v=layout-r03b';
export {config};
export const leafWidth=(config.zEnd-config.zStart+2*config.overlap)/3;
export const leafStep=leafWidth-config.overlap;
export const doorSweep={name:'kitchen-door-sweep',x:1.575,z:4.25,w:.17,d:2.52};
export function advanceDoor(current,target,dt,reducedMotion=false){
 if(reducedMotion)return target;
 const delta=Math.min(Math.abs(target-current),Math.max(0,dt)/config.seconds);
 return current+Math.sign(target-current)*delta;
}
export function getKitchenDoorColliders(open=1,reserveSweep=false){
 const t=Math.max(0,Math.min(1,open));
 const jambs=[{name:'kitchen-door-north-jamb',x:1.575,z:4.25,w:.17,d:.02},{name:'kitchen-door-south-jamb',x:1.52,z:6.75,w:.225,d:.02}];
 if(reserveSweep)return [...jambs,doorSweep];
 return [...jambs,...config.xCenters.map((x,i)=>({name:'kitchen-door-leaf-'+i,x:x-config.frameDepth/2,z:config.zStart+(1-t)*i*leafStep,w:config.frameDepth+(i===2?.006:0),d:leafWidth}))];
}
