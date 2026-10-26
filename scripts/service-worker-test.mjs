import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const origin = 'https://portfolio.test';
const handlers = new Map();
const stores = new Map();
const keyFor = value => new URL(typeof value === 'string' ? value : value.url, origin).href;
const caches = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      async addAll(paths) { for (const path of paths) store.set(keyFor(path), new Response(`cached:${path}`)); },
      async match(request) { return store.get(keyFor(request))?.clone(); },
      async put(request, response) { store.set(keyFor(request), response.clone()); },
    };
  },
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); },
};
let calls = 0;
let network = async () => new Response('fresh');
vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), {
  self: { location: { origin }, clients: { claim: async () => {} }, skipWaiting: async () => {}, addEventListener: (name, handler) => handlers.set(name, handler) },
  caches, URL, Response,
  fetch: async request => { calls++; return network(request); },
});
async function lifecycle(name) {
  let pending;
  handlers.get(name)({ waitUntil: promise => { pending = promise; } });
  await pending;
}
async function request(path, { navigate = false, headers = {}, method = 'GET' } = {}) {
  let response;
  handlers.get('fetch')({
    request: { url: new URL(path, origin).href, method, mode: navigate ? 'navigate' : 'cors', headers: new Headers(headers) },
    respondWith: promise => { response = promise; },
  });
  return response;
}
await caches.open('adriel-portfolio-v8');
await caches.open('another-app-cache');
await lifecycle('install');
await lifecycle('activate');
assert.deepEqual(await caches.keys(), ['another-app-cache', 'adriel-portfolio-v11']);
const cache = await caches.open('adriel-portfolio-v11');
for (const path of ['/api/visits', '/api/analytics', '/_vercel/insights', 'https://cdn.test/script.js', '/video.mp4']) {
  assert.equal(await request(path), undefined, path);
}
assert.equal(await request('/images/photo.jpg', { headers: { range: 'bytes=0-10' } }), undefined);
assert.equal(await request('/api/contact', { method: 'POST' }), undefined);
assert.equal(calls, 0, 'Bypassed requests must remain under browser network control');
await cache.put('/style.css', new Response('old CSS'));
assert.equal(await (await request('/style.css')).text(), 'fresh');
assert.equal(await (await cache.match('/style.css')).text(), 'fresh');
await cache.put('/assets/app-abc123.js', new Response('immutable bundle'));
const before = calls;
assert.equal(await (await request('/assets/app-abc123.js')).text(), 'immutable bundle');
assert.equal(calls, before);
network = async () => new Response('private', { headers: { 'cache-control': 'no-store' } });
await request('/private.json');
assert.equal(await cache.match('/private.json'), undefined);
network = async () => new Response('missing', { status: 404 });
assert.equal((await request('/missing.css')).status, 404);
assert.equal(await cache.match('/missing.css'), undefined);
network = async () => { throw new Error('Offline'); };
assert.equal(await (await request('/style.css')).text(), 'fresh');
assert.equal(await (await request('/projects', { navigate: true })).text(), 'cached:/');
assert.equal(await (await request('/honors/2026/unvisited', { navigate: true })).text(), 'cached:/offline');
await cache.put('/honors/2026/visited', new Response('cached honor detail'));
assert.equal(await (await request('/honors/2026/visited', { navigate: true })).text(), 'cached honor detail');
assert.equal((await request('/uncached.png')).type, 'error');
console.log('Service worker tests pass: cache migration, API/third-party/range bypass, fresh CSS, immutable bundles, no-store/404 handling, and offline routes.');
