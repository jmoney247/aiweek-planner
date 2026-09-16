const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/map-clusters.ts'),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
const clusterize = context.exports.clusterize;
const data = Object.entries(require('../lib/event-coordinates.json')).map(([id,e]) => ({id,...e}));
for (const zoom of [8,11,12,13,14,15,16,18]) {
  const clusters=clusterize(data,zoom);
  assert.equal(clusters.reduce((n,c)=>n+c.events.length,0),data.length);
  assert.equal(new Set(clusters.flatMap(c=>c.events.map(e=>e.id))).size,data.length);
}
assert.ok(clusterize(data,18).length > clusterize(data,8).length);
assert.equal(clusterize(data,18).length,new Set(data.map(e=>`${e.lat}:${e.lng}`)).size);
assert.equal(clusterize([],13).length,0);
const same=[{id:'a',lat:42.35,lng:-71.05},{id:'b',lat:42.35,lng:-71.05}];
assert.equal(clusterize(same,18)[0].events.length,2);
console.log(`PASS: ${data.length} coordinate records remain represented across all zoom levels; clusters split and shared venues stay browsable.`);
