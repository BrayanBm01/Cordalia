const puppeteer = require('puppeteer-core');

const EXE = '/usr/bin/brave';
const BASE = 'http://localhost:5173';
const EMAIL = 'vendedor.demo@exploraturismo.local';
const PASS = 'VendedorDemo#2026!';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const results = [];
  const ok = (name, cond) => { results.push(`  ${cond ? 'OK ' : 'FAIL'}  ${name}`); if (!cond) process.exitCode = 1; };
  const bt = () => page.evaluate(() => document.body.innerText.toLowerCase());

  function usesGlobal() {
    // no-op guard (eliminado)
  }

  // ===== 1) PlanDetalle plan 6: 95.000 con 20% activo -> 76.000/persona =====
  await page.goto(`${BASE}/planes/6`, { waitUntil: 'networkidle0', timeout: 45000 });
  await sleep(1600);
  let t = await bt();
  ok('PD: "Precio final"', t.includes('precio final'));
  ok('PD: $76.000', t.includes('76.000'));
  ok('PD: -20%', t.includes('-20%'));
  ok('PD: "Por persona"', t.includes('por persona'));
  ok('PD: sin "(a $... c/u)"', !t.includes('c/u') && !t.includes('a $'));
  ok('PD: "Subtotal original"', t.includes('subtotal original'));
  ok('PD: $190.000 (2p)', t.includes('190.000'));
  ok('PD: descuento $38.000', t.includes('38.000'));
  ok('PD: TOTAL $152.000', t.includes('152.000'));
  await page.screenshot({ path: '/tmp/opencode/shot_plan_detalle.png' });

  // ===== 2) LugarDetalle de un destino demo cordobés =====
  await page.goto(`${BASE}/lugares/4`, { waitUntil: 'networkidle0', timeout: 45000 });
  await sleep(1400);
  t = await bt();
  ok('LD: sección "Ubicación"', t.includes('ubicaci'));
  ok('LD: "Córdoba, Colombia"', t.includes('córdoba, colombia') || t.includes('cordoba, colombia'));
  ok('LD: sin "Sabores del destino"', !t.includes('sabores del destino') && !t.includes('sabores'));
  ok('LD: sin "Dónde quedarse"', !t.includes('dónde quedarse') && !t.includes('donde quedarse'));
  await page.screenshot({ path: '/tmp/opencode/shot_lugar_detalle.png' });

  // ===== 3) Login vendedor demo =====
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0', timeout: 45000 });
  await sleep(1500);
  const loginFilled = await page.evaluate(({ email, pass }) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const em = inputs.find((i) => i.type === 'email');
    const pw = inputs.find((i) => i.type === 'password');
    if (!em || !pw) return { ok: false };
    const set = (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set(em, email);
    set(pw, pass);
    return { ok: true };
  }, { email: EMAIL, pass: PASS });
  ok('Login: campos email/password', loginFilled.ok);
  await sleep(600);
  const loginClicked = await page.evaluate(() => {
    const bts = Array.from(document.querySelectorAll('button'));
    const b = bts.find((x) => /iniciar|ingres|entrar|entré|ingresar/i.test(x.innerText));
    if (b) { b.click(); return true; }
    return false;
  });
  ok('Login: botón "Iniciar sesión"', loginClicked);
  await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 30000 }).catch(() => {});
  await sleep(1500);
  ok('Login demo (sesión activa)', !page.url().includes('/login'));

  // ===== 4) MoneyInput en formulario de plan (negocio 3, dueño vendedor demo) =====
  await page.goto(`${BASE}/mis-negocios/3`, { waitUntil: 'networkidle0', timeout: 45000 });
  await sleep(1500);
  const tabClicked = await page.evaluate(() => {
    const bts = Array.from(document.querySelectorAll('button'));
    const b = bts.find((x) => /planes y promociones/i.test(x.innerText));
    if (b) { b.click(); return true; }
    return false;
  });
  ok('PlanesNegocio: tab "Planes y promociones"', tabClicked);
  await sleep(1200(all));
  const planBtn = await page.evaluate(() => {
    const bts = Array.from(document.querySelectorAll('button'));
    const b = bts.find((x) => /nuevo plan|nuevo servicio/i.test(x.innerText));
    if (b) { b.click(); return true; }
    return false;
  });
  ok('PlanesNegocio: "Nuevo plan"', planBtn);
  await sleep(1500);
  const moneyPlan = await page.evaluate(() => {
    const inp = Array.from(document.querySelectorAll('input')).find((i) => i.placeholder === 'Ej: 132000');
    if (!inp) return { found: false };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(inp, '132000');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return { found: true };
  });
  ok('PlanForm: MoneyInput "Ej: 132000"', moneyPlan.found);
  await sleep(700);
  const moneyPlanFinal = await page.evaluate(() => {
    const inp = Array.from(document.querySelectorAll('input')).find((i) => i.placeholder === 'Ej: 132000');
    return inp ? inp.value : null;
  });
  ok('PlanForm: 132000 -> 132.000', moneyPlanFinal === '132.000');
  await page.screenshot({ path: '/tmp/opencode/shot_plan_form_money.png' });

  // ===== 5) PromoForm: descuento sobre el precio normal (% o COP) =====
  await page.evaluate(() => {
    const bts = Array.from(document.querySelectorAll('button'));
    const b = bts.find((x) => /nueva promoc/i.test(x.innerText));
    if (b) b.click();
  });
  await sleep(1500);
  const promoPct = await page.evaluate(() => {
    const sel = document.querySelector('select');
    if (!sel) return { found: false };
    const set = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    set.call(sel, 'porcentaje');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { found: true };
  });
  ok('PromoForm: select tipo descuento', promoPct.found);
  await sleep(700);
  const promoSelLabel = await page.evaluate(() => {
    const t = document.body.innerText.toLowerCase();
    const hasSoles = t.includes('precio promocional');
    const hasDefault = t.includes('precio anterior');
    return { hasSoles, hasDefault };
  });
  ok('PromoForm %: sin "Precio promocional"', !promoSelLabel.hasSoles);
  ok('PromoForm %: sin "Precio anterior"', !promoSelLabel.hasDefault);
  await page.select('select', 'valor');
  await sleep(700);
  const promoVal = await page.evaluate(() => {
    const hasMoney = Array.from(document.querySelectorAll('input')).some((i) => i.placeholder === 'Ej: 20000');
    const hasLabPre = Array.from(document.querySelectorAll('label')).some((l) => /valor del descuento \(cop\)/i.test(l.textContent));
    return { hasMoney, hasLabPre };
  });
  ok('PromoForm valor: MoneyInput descuento (COP)', promoVal.hasMoney);
  ok('PromoForm valor: label "Valor del descuento (COP)"', promoVal.hasLabPre);
  await page.screenshot({ path: '/tmp/opencode/shot_promo_form.png' });

  console.log('\n== VERIFICACIÓN VISUAL ==');
  console.log(results.join('\n'));
  console.log(process.exitCode ? '\nRESULTADO: FAIL' : '\nRESULTADO: OK');
  await browser.close();
})();
