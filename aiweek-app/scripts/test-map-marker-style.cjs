const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/map-marker-style.ts'),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
const style = context.exports.markerStyle;
assert.equal(style(1).size,16);
assert.equal(style(1).hitSize,44);
for (const [count,color] of [[1,'#FF8A3D'],[2,'#4CB7D0'],[5,'#4CB7D0'],[6,'#F2EF70'],[19,'#F2EF70'],[20,'#EC87B5'],[1000,'#EC87B5']]) assert.equal(style(count).color,color);
const luminance = hex => hex.match(/[a-f0-9]{2}/gi).map(n => parseInt(n,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
for(let count=2;count<=1000;count++) {
  assert.ok(style(count).size>style(1).size);
  assert.ok(style(count).size>=style(count-1).size);
  assert.ok(style(count).size<=64);
  assert.ok(style(count).hitSize>=44);
  assert.ok((luminance(style(count).color)+.05)/(luminance('#2D211B')+.05)>=4.5);
}
console.log('PASS: 16px single dots, 44px targets, blue/yellow/pink thresholds, monotonic sizes capped at 64px, and AA count-text contrast.');
