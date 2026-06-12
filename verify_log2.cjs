const { chromium } = require('playwright');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  // Test data: y = 2 + 3·ln(x)
  // x: 1,2,3,5,8,13,21  →  y=2, 4.079, 5.296, 6.828, 8.238, 9.565, 10.91
  const data = [
    ['1','2'],['2','4.079'],['3','5.296'],['5','6.828'],
    ['8','8.238'],['13','9.565'],['21','10.91'],
  ];

  await page.goto('http://localhost:5173/datos');
  await page.waitForLoadState('networkidle');
  const clr = page.locator('button').filter({ hasText: /limpiar todos|eliminar todos/i });
  if (await clr.count() > 0) {
    await clr.first().click();
    const ok = page.locator('button').filter({ hasText: /confirmar|sí|eliminar/i });
    if (await ok.count() > 0) await ok.first().click();
    await page.waitForTimeout(300);
  }
  for (const [x, y] of data) {
    await page.locator('#valor-x').fill(x);
    await page.locator('#valor-y').fill(y);
    await page.locator('button').filter({ hasText: 'Agregar Par' }).click();
    await page.waitForTimeout(80);
  }

  await page.goto('http://localhost:5173/metodos/logaritmico');
  await page.waitForLoadState('networkidle');
  await page.locator('button').filter({ hasText: /calcular/i }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/logm_01_result.png', fullPage: true });

  const equation  = await page.locator('[class*="equation"]:not([class*="Box"]):not([class*="Placeholder"]):not([class*="Steps"]):not([class*="Values"]):not([class*="Title"])').first().textContent().catch(() => '?');
  const svgCount  = await page.locator('svg.recharts-surface').count();
  const results   = await page.locator('[class*="resultValue"]').allTextContents();
  const quality   = await page.locator('[class*="qualityLabel"]').textContent().catch(() => null);
  const headers   = await page.evaluate(() =>
    Array.from(document.querySelectorAll('th')).map(t => t.textContent?.trim()).filter(Boolean)
  );
  const linTitle  = await page.locator('[class*="linearizationTitle"]').textContent().catch(() => null);
  const interp    = await page.locator('[class*="interpretValue"]').allTextContents();

  console.log('Equation:', equation);
  console.log('SVG charts:', svgCount);
  console.log('Results (a,b,r,R²):', results);
  console.log('Quality:', quality);
  console.log('Linearization:', linTitle);
  console.log('Interpretation values:', interp);
  console.log('Table headers:', headers);

  // Edge: Xi <= 0
  console.log('\n--- Edge: Xi = 0 ---');
  await page.goto('http://localhost:5173/datos');
  await page.waitForLoadState('networkidle');
  const clr2 = page.locator('button').filter({ hasText: /limpiar todos|eliminar todos/i });
  if (await clr2.count() > 0) {
    await clr2.first().click();
    const ok = page.locator('button').filter({ hasText: /confirmar|sí|eliminar/i });
    if (await ok.count() > 0) await ok.first().click();
    await page.waitForTimeout(300);
  }
  for (const [x, y] of [['0','1'],['2','4']]) {
    await page.locator('#valor-x').fill(x);
    await page.locator('#valor-y').fill(y);
    await page.locator('button').filter({ hasText: 'Agregar Par' }).click();
    await page.waitForTimeout(80);
  }
  await page.goto('http://localhost:5173/metodos/logaritmico');
  await page.waitForLoadState('networkidle');
  await page.locator('button').filter({ hasText: /calcular/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/logm_02_invalid.png', fullPage: false });
  const warning = await page.locator('[class*="warningBanner"]').textContent().catch(() => null);
  console.log('Warning (Xi=0):', warning?.trim().slice(0, 80));

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
