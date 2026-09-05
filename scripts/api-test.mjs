import assert from 'node:assert/strict';
// Isolated handler tests: all upstream traffic is intercepted locally.
process.env.RESEND_API_KEY = 'test-only';
process.env.GEMINI_API_KEY = 'test-only';
process.env.FIREBASE_DATABASE_URL = '';
process.env.VITE_FIREBASE_DATABASE_URL = '';
process.env.PORTFOLIO_ALLOWED_ORIGINS = 'https://adrielmagalona.dev';
const { default: contact } = await import('../api/contact.js');
const { default: gemini } = await import('../api/gemini.js');
let requests = 0;
globalThis.fetch = async () => { requests++; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Test response' }] } }] }), { status: 200 }); };
let id = 0;
async function invoke(handler, body, { origin = 'https://adrielmagalona.dev', method = 'POST', ip = `test-${++id}` } = {}) {
  const res = { code: 200, body: null, headers: {}, setHeader(k,v){this.headers[k]=v;}, status(code){this.code=code;return this;}, json(body){this.body=body;return this;}, send(body){this.body=body;return this;}, end(){return this;} };
  await handler({ method, headers: { origin, 'x-forwarded-for': ip }, body }, res);
  return res;
}
for (const handler of [contact, gemini]) {
  assert.equal((await invoke(handler, {}, {method:'GET'})).code, 405);
  assert.equal((await invoke(handler, {}, {origin:'https://untrusted.example'})).code, 403);
  assert.equal((await invoke(handler, {}, {method:'OPTIONS'})).code, 204);
  assert.equal((await invoke(handler, '{')).code, 400);
}
assert.equal((await invoke(contact, {message:'short'})).code, 400);
assert.equal((await invoke(contact, {message:'Valid message here',email:'bad'})).code, 400);
assert.equal(requests, 0);
assert.equal((await invoke(contact, {message:'Valid message here',email:'test@example.com'})).body.delivered, true);
assert.equal((await invoke(gemini, {prompt:''})).code, 400);
assert.equal((await invoke(gemini, {prompt:'Hello',model:'invalid'})).code, 400);
assert.equal((await invoke(gemini, {prompt:'Hello'})).body.text, 'Test response');
let limited = 0;
const before = requests;
for (let i=0;i<50;i++) if ((await invoke(contact, {message:'Repeated test submission'}, {ip:'repeat'})).code === 429) limited++;
assert.equal(limited, 47);
assert.equal(requests-before, 3);
console.log('API tests pass: methods, origins, malformed input, validation, stubbed delivery/AI, and 50-attempt rate-limit burst. No external requests sent.');
