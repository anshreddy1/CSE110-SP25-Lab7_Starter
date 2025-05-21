/**
 * __tests__/lab7.test.js
 * Works on current jest-puppeteer / Puppeteer 22.x
 */

 describe('Basic user flow for Website', () => {
  /* ───────── helpers ───────── */
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  async function clickIfText(btnHandle, wanted) {
    const txt = await (await btnHandle.getProperty('innerText')).jsonValue();
    if (txt === wanted) {
      await btnHandle.click();
      await sleep(80);                    // let DOM + localStorage settle
    }
  }

  /* ───────── setup ───────── */
  beforeAll(async () => {
    await page.goto('https://cse110-sp25.github.io/CSE110-Shop/');
    await page.waitForSelector('product-item');
  });

  /* ───────── tests ───────── */

  it('Initial Home Page – should have 20 <product-item> elements', async () => {
    const cnt = await page.$$eval('product-item', (els) => els.length);
    expect(cnt).toBe(20);
  });

  it('Every <product-item> should be populated', async () => {
    // poll until all product-item.data is filled or 3-sec timeout
    const start = Date.now();
    while (Date.now() - start < 3000) {
      const allPopulated = await page.$$eval('product-item', (els) =>
        els.every((e) => {
          const d = e.data;
          return d && d.title && d.price && d.image;
        })
      );
      if (allPopulated) break;
      await sleep(100);
    }
    const final = await page.$$eval('product-item', (els) =>
      els.every((e) => {
        const d = e.data;
        return d && d.title && d.price && d.image;
      })
    );
    expect(final).toBe(true);
  }, 10_000);

  it('Clicking "Add to Cart" should change button text', async () => {
    const first = await page.$('product-item');
    const shadow = await first.getProperty('shadowRoot');
    const btn = await shadow.asElement().$('button');
    await btn.click();
    const txt = await (await btn.getProperty('innerText')).jsonValue();
    expect(txt).toBe('Remove from Cart');
  });

  it('After adding all items, cart count should be 20', async () => {
    const prods = await page.$$('product-item');
    for (const p of prods) {
      const sh = await p.getProperty('shadowRoot');
      const btn = await sh.asElement().$('button');
      await clickIfText(btn, 'Add to Cart');
    }
    // wait until cart-count hits 20
    await page.waitForFunction(
      () => document.getElementById('cart-count').innerText === '20'
    );
    const cnt = await page.$eval('#cart-count', (el) => el.innerText);
    expect(cnt).toBe('20');
  }, 15_000);

  it('Cart state should persist after reload (20 items)', async () => {
    await page.reload({ waitUntil: ['domcontentloaded', 'networkidle0'] });
    const allRemove = await page.$$eval('product-item', (els) =>
      els.every((e) => {
        const btn = e.shadowRoot.querySelector('button');
        return btn.innerText === 'Remove from Cart';
      })
    );
    const cnt = await page.$eval('#cart-count', (el) => el.innerText);
    expect(allRemove).toBe(true);
    expect(cnt).toBe('20');
  }, 10_000);

  it('localStorage cart should equal [1…20]', async () => {
    const cart = await page.evaluate(() => localStorage.getItem('cart'));
    expect(cart).toBe(
      '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]'
    );
  });

  it('Removing all items should set cart count to 0', async () => {
    const prods = await page.$$('product-item');
    for (const p of prods) {
      const sh = await p.getProperty('shadowRoot');
      const btn = await sh.asElement().$('button');
      await clickIfText(btn, 'Remove from Cart');
    }
    await page.waitForFunction(
      () => document.getElementById('cart-count').innerText === '0'
    );
    const cnt = await page.$eval('#cart-count', (el) => el.innerText);
    expect(cnt).toBe('0');
  }, 15_000);

  it('After reload, buttons should show "Add to Cart" and count 0', async () => {
    await page.reload({ waitUntil: ['domcontentloaded', 'networkidle0'] });
    const allAdd = await page.$$eval('product-item', (els) =>
      els.every(
        (e) => e.shadowRoot.querySelector('button').innerText === 'Add to Cart'
      )
    );
    const cnt = await page.$eval('#cart-count', (el) => el.innerText);
    expect(allAdd).toBe(true);
    expect(cnt).toBe('0');
  }, 10_000);

  it('localStorage cart should be an empty array []', async () => {
    const cart = await page.evaluate(() => localStorage.getItem('cart'));
    expect(cart).toBe('[]');
  });
});
