// Live online check: two separate Chromium processes join one room over trystero's real Nostr
// signalling and WebRTC, then trade a hello. Needs the dev server (npm run dev) and internet.
// Same machine only: this proves the transport, not NAT traversal between two homes.
import { chromium } from 'playwright';
const code = 'T' + Math.random().toString(36).slice(2, 7).toUpperCase();
const open = async (name) => {
  const b = await chromium.launch({ args: ['--ignore-certificate-errors'] });
  const p = await (await b.newContext({ ignoreHTTPSErrors: true })).newPage();
  await p.goto('https://localhost:8081/src/game/net.ts').catch(() => {});
  await p.goto('https://localhost:8081/', { waitUntil: 'domcontentloaded' });
  return { b, p, name };
};
const [a, c] = await Promise.all([open('A'), open('B')]);
const join = (h, code) => h.p.evaluate(async (code) => {
  const { TrysteroTransport, NET_VERSION } = await import('/src/game/net.ts');
  const t = new TrysteroTransport(code, 60000); window.__t = t; window.__got = [];
  t.onMessage((m) => window.__got.push(m));
  const t0 = performance.now(); await t.ready; const ms = Math.round(performance.now() - t0);
  t.send({ type: 'hello', v: NET_VERSION, build: 'x', name: 'peer' });
  for (let i = 0; i < 100 && !window.__got.length; i++) await new Promise((r) => setTimeout(r, 100));
  return { connectedAfterMs: ms, received: window.__got.map((m) => m.type) };
}, code);
const t = Date.now();
const res = await Promise.allSettled([join(a, code), join(c, code)]);
console.log(JSON.stringify({ code, wallMs: Date.now() - t, res: res.map((r) => r.status === 'fulfilled' ? r.value : String(r.reason).slice(0, 200)) }));
await a.b.close(); await c.b.close();
