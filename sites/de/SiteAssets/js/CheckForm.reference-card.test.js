const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108 copy.html'), 'utf8');

async function openForm(reducedMotion = false) {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.matchMedia = () => ({ matches: reducedMotion });
      window.CSS = { escape: value => value };
      window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {} });
    },
  });
  await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
  dom.window.eval(dom.window.document.querySelector('script[type="module"]').textContent);
  return dom;
}

test('reference card stays visible until exit ends and can reopen during exit', async () => {
  const dom = await openForm();
  try {
    const { document } = dom.window;
    const link = document.querySelector('.help-link[aria-controls="card-re"]');
    const card = document.getElementById('card-re');
    const body = document.getElementById('sec-re-body');
    link.click();
    link.click();
    assert.ok(card.classList.contains('is-closing'));
    assert.ok(body.classList.contains('open'));
    assert.ok(card.hasAttribute('inert'));
    assert.equal(link.getAttribute('aria-expanded'), 'false');

    link.click();
    assert.ok(!card.classList.contains('hidden'));
    assert.ok(!card.hasAttribute('inert'));
    link.click();
    card.onanimationend({ target: card, animationName: 'flying-card-out' });
    assert.ok(card.classList.contains('hidden'));
    assert.ok(!card.classList.contains('is-closing'));
    assert.ok(!body.classList.contains('open'));
  } finally {
    dom.window.close();
  }
});

test('reduced motion closes the reference immediately and restores focus', async () => {
  const dom = await openForm(true);
  try {
    const { document } = dom.window;
    const link = document.querySelector('.help-link[aria-controls="card-re"]');
    const card = document.getElementById('card-re');
    link.click();
    card.querySelector('.close').click();
    assert.ok(card.classList.contains('hidden'));
    assert.ok(!card.classList.contains('is-closing'));
    assert.ok(!document.getElementById('sec-re-body').classList.contains('open'));
    assert.equal(document.activeElement, link);
  } finally {
    dom.window.close();
  }
});
