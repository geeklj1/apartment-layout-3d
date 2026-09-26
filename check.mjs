import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {model} from './model.js';
import {measurements,totalArea,withoutMainBalcony,dimensionLines,overallDimensions,bayWindow,fmt} from './measurements.js';
assert.equal(model.length,19);assert.equal(Object.keys(measurements).length,6);
for(const m of model){assert.equal(m.index.length%3,0);assert(m.index.every(i=>Number.isInteger(i)&&i>=0&&i<m.position.length/3));assert(m.position.every(Number.isFinite));}
assert(Math.abs(totalArea-57.794601)<.0001);
assert.equal(fmt(totalArea),'57.79');assert.equal(fmt(withoutMainBalcony),'53.01');assert.equal(fmt(measurements['3'].area),'7.73');
assert(overallDimensions[1].text.includes('10.22m'));
assert.equal(dimensionLines.all.length,25);
assert.equal(dimensionLines['0'][2].a[1],-4.786);
assert(!dimensionLines['12'].some(line=>line.text.includes('1.07')));
assert.equal(fmt(bayWindow.width),'1.38');assert.equal(fmt(bayWindow.depth),'0.25');
assert.equal(fmt(dimensionLines['12'].filter(d=>d.chain).reduce((sum,d)=>sum+Math.hypot(d.b[0]-d.a[0],d.b[1]-d.a[1]),0)),'8.12');
assert(Math.abs(measurements['7'].area-measurements['7'].width*measurements['7'].depth)<.0001);
for(const id of ['0','3','4','12','13'])assert(measurements[id].area<measurements[id].width*measurements[id].depth);
for(const lines of Object.values(dimensionLines))for(const line of lines){assert(line.a.every(Number.isFinite));assert(line.b.every(Number.isFinite));assert(Math.hypot(line.a[0]-line.b[0],line.a[1]-line.b[1])>0);}
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
for(const [,asset] of html.matchAll(/(?:src|href)="\.\/([^"?#]+)"/g))assert(existsSync(new URL('./'+asset,import.meta.url)),asset);
for(const text of ['57.79','53.01','64.3','尚未把不确定的墙体改成20楼定稿','show-dimensions','show-areas','show-windows','dimension-mode'])assert(html.includes(text));
assert(html.includes('<h1>户型 · 面积与尺寸</h1>'));
assert(!/\/Users\/|birthdate|dateOfBirth/.test(html));
assert(readFileSync(new URL('./dimension-plan.svg',import.meta.url),'utf8').includes('57.79㎡'));
const withoutAreas=readFileSync(new URL('./dimension-plan-no-areas.svg',import.meta.url),'utf8');
assert(!withoutAreas.includes('class="area">'));assert(withoutAreas.includes('主卧'));
console.log('PASS: raw triangle areas, totals, irregular boundaries, dimension endpoints, local assets, fallback and public-page privacy.');
