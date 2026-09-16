const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let width, height, calls = 0, uploadOptions;
const canvas = { width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage() {} }), toBlob(cb, type, quality) { width = this.width; height = this.height; calls++; cb(new Blob([new Uint8Array(quality > .8 ? 1100000 : 800000)], { type })); } };
const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/photo-upload.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
  exports: moduleObject.exports, module: moduleObject, Blob, File, URL,
  Image: class { naturalWidth = 6000; naturalHeight = 4000; async decode() {} },
  document: { createElement: () => canvas },
  require: name => name === 'tus-js-client' ? { Upload: class { constructor(file, options) { uploadOptions = options; } start() { uploadOptions.onProgress(1, 2); uploadOptions.onSuccess(); } } } : name === './community-client' ? { communityRequest: async () => ({ path: 'own/staging/image.jpg', token: 'scoped-token', endpoint: 'https://example.test/upload/resumable' }) } : { default: async () => new Blob(['converted']) },
});
(async () => {
  const { optimizePhoto, uploadPhoto, MAX_PHOTO_BYTES } = moduleObject.exports;
  await assert.rejects(() => optimizePhoto(new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], 'large.jpg')), /15 MB/);
  const photo = await optimizePhoto(new File(['photo'], 'iphone.jpg', { type: 'image/jpeg' }));
  assert.equal(width, 2000); assert.equal(height, 1333); assert.equal(photo.type, 'image/jpeg'); assert(photo.size < 1000000); assert.equal(calls, 2);
  let progress;
  assert.equal(await uploadPhoto(photo, value => progress = value), 'own/staging/image.jpg');
  assert.equal(progress, 50); assert.equal(uploadOptions.headers['x-signature'], 'scoped-token');
  assert.equal(uploadOptions.chunkSize, 6 * 1024 * 1024); assert(uploadOptions.retryDelays.length >= 5);
  console.log('PASS: 15 MB input limit, 2000px resizing, adaptive compression under 1 MB, signed resumable uploads and progress. Browser decoding and live storage still require a preview smoke test.');
})().catch(error => { console.error(error); process.exitCode = 1; });
