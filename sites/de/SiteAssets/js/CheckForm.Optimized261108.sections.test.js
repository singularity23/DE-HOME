const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');

async function createForm () {
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108.html'), 'utf8');
  const marker = '      async #buildPdfDefinition () {';
  assert.ok(source.includes(marker));
  const html = source.replace('<script type="module">', '<script>').replace(
    marker,
    '      pdfCardForTest (id) { return this.#isPdfCardVisible(id); }\n' +
      '      buildPdfForTest () { return this.#buildPdfDefinition(); }\n' +
      '      underlineForTest (el) { return this.#isUnderlineHidden(el); }\n' +
      '      signaturesForTest () { return this.#sig.allOpenEnabled(); }\n' +
      marker
  );
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    virtualConsole,
    beforeParse (window) {
      window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect () {} });
      window.fetch = async () => ({ ok: false });
      window.CSS = { escape: value => value };
    },
  });
  await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
  assert.deepEqual(errors, []);
  return dom;
}

function answer (document, id) {
  document.getElementById(id).click();
}

function isOpen (document, n) {
  return document.getElementById(`s${n}`).classList.contains('open');
}

test('eligible sections remain collapsed across unrelated changes and reopen when newly applicable', async () => {
  const dom = await createForm();
  try {
    const document = dom.window.document;
    document.querySelector('.risk-btn[data-risk="high"]').click();
    answer(document, 'sc9_yes');
    answer(document, 'sc11_no');

    for (const n of [2, 3, 5, 6]) {
      assert.equal(isOpen(document, n), true, `section ${n} opens when applicable`);
      document.getElementById(`sec${n}-head`).click();
      assert.equal(isOpen(document, n), false, `section ${n} closes`);
      assert.equal(document.getElementById(`sec${n}-head`).getAttribute('aria-expanded'), 'false');
    }

    answer(document, 'sc1_yes');
    for (const n of [2, 3, 5, 6]) assert.equal(isOpen(document, n), false);

    answer(document, 'sc11_yes');
    assert.equal(document.getElementById('card-ds').classList.contains('hidden'), true);
    answer(document, 'sc11_no');
    assert.equal(isOpen(document, 2), true);

    document.querySelector('.risk-btn[data-risk="low"]').click();
    for (const n of [3, 5, 6]) assert.equal(isOpen(document, n), false);
    document.querySelector('.risk-btn[data-risk="high"]').click();
    for (const n of [3, 5, 6]) assert.equal(isOpen(document, n), true);
  } finally {
    dom.window.close();
  }
});

test('optional and mandatory peer review update requirements and progress when toggled', async () => {
  const dom = await createForm();
  try {
    const document = dom.window.document;
    const form = dom.window.__checkFormInstance;
    document.querySelector('.risk-btn[data-risk="low"]').click();
    answer(document, 'sc1_yes');
    const name = document.getElementById('pr-name');
    const date = document.getElementById('pr-date');
    const head = document.getElementById('sec4-head');
    assert.equal(name.disabled, true);
    form.updateProgress();
    const withoutPeer = form.elements.progressBar.value;

    head.click();
    assert.equal(name.disabled, false);
    assert.equal(date.required, true);
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.ok(form.elements.progressBar.value < withoutPeer);
    head.click();
    assert.equal(name.disabled, true);
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal(form.elements.progressBar.value, withoutPeer);

    const level = document.getElementById('minCheckLevel');
    level.value = 'Peer Review';
    level.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    assert.equal(isOpen(document, 4), true);
    head.click();
    assert.equal(isOpen(document, 4), false);
    assert.equal(name.disabled, false);
    form.updateProgress();
    assert.ok(form.elements.progressBar.value < withoutPeer);
    answer(document, 'sc2_yes');
    assert.equal(isOpen(document, 4), false);
  } finally {
    dom.window.close();
  }
});

test('collapsed applicable sections still require fields and signatures and appear in PDFs', async () => {
  const dom = await createForm();
  try {
    const document = dom.window.document;
    const form = dom.window.__checkFormInstance;
    document.querySelector('.risk-btn[data-risk="high"]').click();
    answer(document, 'sc9_yes');
    answer(document, 'sc11_no');
    for (const n of [1, 2, 3, 5, 6]) document.getElementById(`sec${n}-head`).click();

    for (const id of ['card-sc', 'card-ds', 'card-ch', 'card-ir', 'card-final']) {
      assert.equal(form.pdfCardForTest(id), true, `${id} must be included`);
    }
    const reviewerName = document.getElementById('ir-name');
    assert.equal(reviewerName.required, true);
    assert.equal(form.underlineForTest(reviewerName.nextElementSibling), false);
    assert.equal(form.signaturesForTest(), false);
    assert.equal(form.pdfCardForTest('card-pr'), false);
    const pdf = JSON.stringify((await form.buildPdfForTest()).content);
    assert.match(pdf, /Independent Structural Review/);
    assert.match(pdf, /Self-Check/);
  } finally {
    dom.window.close();
  }
});
