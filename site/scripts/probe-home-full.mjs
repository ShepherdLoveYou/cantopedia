import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');

const browser = await chromium.launch();
for (const vp of [{w:1280,h:800,name:'desktop'},{w:768,h:1024,name:'tablet'},{w:375,h:667,name:'mobile'}]) {
  const p = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  await p.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.screenshot({ path: resolve(OUT, `home-${vp.name}-centered.png`), fullPage: false });
  await p.close();
}
await browser.close();
console.log('Captured 3 screenshots');
