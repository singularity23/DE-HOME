const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');

async function createForm (source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108.html'), 'utf8')) {
  const marker = '      async #buildPdfDefinition () {';
  assert.ok(source.includes(marker));
  const html = source.replace('<script type="module">', '<script>').replace(
    marker,
    '      pdfCardForTest (id) { return this.#isPdfCardVisible(id); }\n' +
      '      buildPdfForTest () { return this.#buildPdfDefinition(); }\n' +
      '      underlineForTest (el) { return this.#isUnderlineHidden(el); }\n' +
      '      signaturesForTest () { return this.#sig.allOpenEnabled(); }\n' +
      '      setSignatureForTest (prefix, dataUrl) { this.#sig.setSignature(prefix, dataUrl); }\n' +
      '      scheduleCommentsForTest () { this.#comments.scheduleSyncHeights(); }\n' +
      marker
  ).replace(
    '      updateProgress () {',
    '      updateProgress () {\n        window.progressUpdates = (window.progressUpdates || 0) + 1;'
  ).replace(
    '      syncCssStateClasses () {',
    '      syncCssStateClasses () {\n        window.cssUpdates = (window.cssUpdates || 0) + 1;'
  ).replace(
    '      syncHeights () {',
    '      syncHeights () {\n        window.heightUpdates = (window.heightUpdates || 0) + 1;'
  );
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    virtualConsole,
    beforeParse (window) {
      window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect () {} });
      window.fetch = async () => ({ ok: false });
      window.CSS = { escape: value => value };
      window.confirm = () => true;
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

test('initialization refreshes progress, CSS, and editor heights only once', async () => {
  const dom = await createForm();
  try {
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(dom.window.progressUpdates, 1);
    assert.equal(dom.window.cssUpdates, 1);
    assert.equal(dom.window.heightUpdates, 1);
    assert.equal(dom.window.document.getElementById('sc_role_eng').checked, true);
    assert.equal(dom.window.document.getElementById('card-ds').classList.contains('hidden'), true);
  } finally {
    dom.window.close();
  }
});

test('answer groups preserve binary N/A spacing and shared labels', async () => {
  const dom = await createForm();
  try {
    const { document } = dom.window;
    const binaryNa = document.getElementById('sc8_na');
    assert.equal(binaryNa.disabled, true);
    assert.equal(document.querySelector('label[for="sc8_na"]').textContent, ' ');
    assert.equal(document.querySelector('label[for="sc8_yes"]').textContent, 'Yes');
    assert.equal(document.querySelector('label[for="sc8_no"]').textContent, 'No');

    const regularNa = document.getElementById('sc1_na');
    assert.equal(regularNa.disabled, false);
    assert.equal(document.querySelector('label[for="sc1_na"]').textContent, 'N/A');
    assert.equal(document.querySelector('#ch_c_yes').dataset.prefix, 'ch');
  } finally {
    dom.window.close();
  }
});

test('signature updates keep the hidden value and preview synchronized', async () => {
  const dom = await createForm();
  try {
    const { document, __checkFormInstance: form } = dom.window;
    const dataUrl = 'data:image/png;base64,ZmFrZQ==';
    const hidden = document.getElementById('ch_sig_data');
    const preview = document.querySelector('.sig-draw-surface[data-prefix="ch"] .sig-inline-preview img');
    const surface = document.querySelector('.sig-draw-surface[data-prefix="ch"]');

    form.setSignatureForTest('ch', dataUrl);
    assert.equal(hidden.value, dataUrl);
    assert.equal(preview.getAttribute('src'), dataUrl);
    assert.equal(surface.classList.contains('has-signature'), true);

    form.setSignatureForTest('ch', '');
    assert.equal(hidden.value, '');
    assert.equal(preview.hasAttribute('src'), false);
    assert.equal(surface.classList.contains('has-signature'), false);
  } finally {
    dom.window.close();
  }
});

test('clear and reset flush pending refreshes once and preserve their scope and defaults', async () => {
  const dom = await createForm();
  try {
    const { document } = dom.window;
    const form = dom.window.__checkFormInstance;
    document.querySelector('.risk-btn[data-risk="high"]').click();
    answer(document, 'sc_role_eit');
    answer(document, 'ch1_yes');
    answer(document, 'ch_c_yes');
    document.getElementById('ch-name').value = 'Checker';
    document.getElementById('ch_sig_data').value = 'saved signature';
    await new Promise(resolve => setTimeout(resolve, 100));

    for (const [action, clear] of [
      ['clear', () => form.clearSection('s3')],
      ['reset', () => form.resetForm()],
    ]) {
      dom.window.progressUpdates = 0;
      dom.window.cssUpdates = 0;
      dom.window.heightUpdates = 0;
      form.scheduleUpdateProgress();
      form.scheduleCommentsForTest();
      clear();
      assert.equal(dom.window.progressUpdates, 1);
      assert.equal(dom.window.cssUpdates, 1);
      assert.equal(dom.window.heightUpdates, 1);
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(dom.window.progressUpdates, 1);
      assert.equal(dom.window.cssUpdates, 1);
      assert.equal(dom.window.heightUpdates, 1);
      assert.equal(Object.keys(form.formState.ch).length, 0);
      assert.equal(document.getElementById('ch-name').value, '');
      assert.equal(document.getElementById('ch_sig_data').value, '');
      assert.equal(document.getElementById('chSigUploadBtn').disabled, true);
      if (action === 'clear') {
        assert.equal(document.getElementById('sc_role_eit').checked, true);
        assert.equal(form.formState.sc[11], 'no');
        assert.equal(document.getElementById('direct-supervisor').required, true);
      }
    }
    assert.equal(document.getElementById('sc_role_eng').checked, true);
    assert.equal(document.getElementById('revision').value, '0');
    assert.equal(document.querySelector('.risk-btn.active'), null);
    for (const answers of Object.values(form.formState)) assert.equal(Object.keys(answers).length, 0);
  } finally {
    dom.window.close();
  }
});

test('restored rows and answers survive a single initialization refresh', async () => {
  const dom = await createForm();
  let restored;
  try {
    const { document } = dom.window;
    document.querySelector('.risk-btn[data-risk="high"]').click();
    answer(document, 'sc9_yes');
    answer(document, 'sc11_no');
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
      if (radio.checked) radio.setAttribute('checked', '');
      else radio.removeAttribute('checked');
    });
    const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108.html'), 'utf8');
    const snapshot = source.replace('<div id="app"></div>', `<div id="app">${document.getElementById('app').innerHTML}</div>`);
    restored = await createForm(snapshot);
    await new Promise(resolve => setTimeout(resolve, 100));
    const form = restored.window.__checkFormInstance;
    assert.equal(form.isRestored, true);
    assert.equal(form.formState.sc[9], 'yes');
    assert.equal(form.formState.sc[11], 'no');
    assert.equal(restored.window.document.querySelectorAll('#sc-rows .check-row').length, 11);
    assert.equal(isOpen(restored.window.document, 2), true);
    assert.equal(restored.window.progressUpdates, 1);
    assert.equal(restored.window.cssUpdates, 1);
    assert.equal(restored.window.heightUpdates, 1);
  } finally {
    restored?.window.close();
    dom.window.close();
  }
});

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
