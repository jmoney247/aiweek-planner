const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const data = require('../lib/event-coordinates.json');
const source = fs.readFileSync(path.join(__dirname, '../lib/event-coordinates.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const context = { exports: {}, require: () => data };
vm.runInNewContext(compiled, context);
const resolve = context.exports.eventCoordinates;
for (const [id, location] of Object.entries(data)) {
  const event = { id, address: location.address, venue: location.venue, city: location.city };
  assert.equal(resolve(event).lat, location.lat);
  assert.equal(resolve(event).lng, location.lng);
  assert.equal(resolve({ ...event, address: 'Venue changed' }).lat, null);
  assert.equal(resolve({ ...event, venue: 'Venue changed' }).lat, null);
  assert.equal(resolve({ ...event, lat: 42.3, lng: -71.1 }).lat, 42.3);
  assert.ok(location.lat > 41 && location.lat < 43 && location.lng > -73 && location.lng < -70);
}
assert.equal(resolve({ id: 'unknown' }).lat, null);
assert.equal(resolve({ lat: NaN, lng: -71 }).lat, null);
assert.equal(resolve({ lat: 100, lng: -71 }).lat, null);
console.log(`Coordinate checks passed for ${Object.keys(data).length} records; moved venues cannot inherit old pins.`);
