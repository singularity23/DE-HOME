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

test('reference close control and help links keep visibility and accessibility state in sync', async () => {
  const dom = await createForm();
  try {
    const { document } = dom.window;
    const card = document.getElementById('card-re');
    const links = [...document.querySelectorAll('.help-link[aria-controls="card-re"]')];
    const close = card.querySelector('div.close');
    assert.equal(links.length, 2);
    assert.equal(close.getAttribute('role'), 'button');
    assert.equal(close.getAttribute('tabindex'), '0');
    assert.equal(close.getAttribute('aria-label'), 'Close Reference');
    for (const [index, key] of [[0, null], [1, 'Enter'], [0, ' ']]) {
      links[index].click();
      assert.equal(card.classList.contains('hidden'), false);
      assert.equal(document.getElementById('sec-re-body').classList.contains('open'), true);
      assert.ok(links.every(link => link.getAttribute('aria-expanded') === 'true'));
      close.focus();
      if (key) close.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true }));
      else close.querySelector('span').click();
      assert.equal(card.classList.contains('hidden'), true);
      assert.equal(document.getElementById('sec-re-body').classList.contains('open'), false);
      assert.ok(links.every(link => link.getAttribute('aria-expanded') === 'false'));
      assert.equal(document.activeElement, links[index]);
    }
    links[0].click();
    links[1].click();
    assert.equal(card.classList.contains('hidden'), true);
  } finally {
    dom.window.close();
  }
});

test('console API exposes the live form and isolated answer snapshots', async () => {
  const dom = await createForm();
  try {
    const { CheckFormAPI: api, __checkFormInstance: form, document } = dom.window;
    assert.equal(Object.isFrozen(api), true);
    assert.equal(api.instance, form);
    assert.equal(api.allRequiredFieldsValid(), form.allRequiredFieldsValid());
    assert.equal(api.getReadinessState().pct, form.getReadinessState().pct);
    assert.equal(api.getRadioValue('sc_role'), form.getRadioValue('sc_role'));
    assert.equal(api.answerLabel('na'), 'N/A');
    assert.equal(api.evaluateRiskNotices({ answers: { 9: 'yes' }, level: 'low', isEit: false }).hasErrors, true);

    answer(document, 'sc1_yes');
    const state = api.getState();
    assert.equal(state.sc[1], 'yes');
    state.sc[1] = 'no';
    assert.equal(api.getState().sc[1], 'yes');

    api.setRiskLevel('high');
    assert.equal(api.getActiveRiskLevel(), 'high');
    assert.equal(api.computeVisibilityState().finalShown, true);
  } finally {
    dom.window.close();
  }
});

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

test('comment editors initialize by card pair and section clear releases undo history', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108.html'), 'utf8')
    .replace('      #loadDependencies () {', '      #loadDependencies () { return Promise.resolve();');
  const dom = await createForm(source);
  try {
    const { document } = dom.window;
    const editors = [];
    dom.window.Quill = class {
      constructor (container) {
        this.root = container.querySelector('.ql-editor');
        this.clipboard = { convert: ({ html }) => html };
        this.history = { clear: () => { this.historyCleared = true; } };
        editors.push(this);
      }
      on (name, handler) { this.onChange = handler; }
      setContents (html) { this.root.innerHTML = typeof html === 'string' ? html : ''; }
      off () {}
    };
    const first = document.querySelector('#checkerComments-editor .ql-editor');
    first.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true }));
    first.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(editors.length, 2);
    const second = document.querySelector('#engineerResponse-editor .ql-editor');
    second.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(editors.length, 2);
    const otherCard = document.querySelector('#engineerResponse_2-editor .ql-editor');
    otherCard.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(editors.length, 4);
    assert.deepEqual(editors.map(editor => editor.root.parentElement.id), [
      'checkerComments-editor', 'engineerResponse-editor', 'reviewerComments-editor', 'engineerResponse_2-editor',
    ]);

    editors[0].root.innerHTML = '<p>Comment</p>';
    editors[0].onChange();
    assert.equal(document.getElementById('checkerComments').value, '<p>Comment</p>');
    dom.window.__checkFormInstance.clearSection('s3');
    assert.equal(editors[0].historyCleared, true);
    assert.equal(editors[1].historyCleared, true);
    assert.equal(document.getElementById('checkerComments').value, '');
  } finally {
    dom.window.close();
  }
});

test('focus stays on the most recently focused editor while its pair loads', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108.html'), 'utf8')
    .replace('      #loadDependencies () {', '      #loadDependencies () { return new Promise(resolve => { window.finishEditorLoad = resolve; });');
  const dom = await createForm(source);
  try {
    const { document } = dom.window;
    dom.window.Quill = class {
      constructor (container) {
        this.root = container.querySelector('.ql-editor');
        this.clipboard = { convert: ({ html }) => html };
        this.history = { clear () {} };
      }
      on () {}
      setContents (html) { this.root.innerHTML = html; }
      off () {}
    };
    const first = document.querySelector('#checkerComments-editor .ql-editor');
    const second = document.querySelector('#engineerResponse-editor .ql-editor');
    first.focus();
    second.focus();
    dom.window.finishEditorLoad();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(document.activeElement, document.querySelector('#engineerResponse-editor .ql-editor'));
  } finally {
    dom.window.close();
  }
});

test('snapshots store editor content once in markup and restore it on reopening', async () => {
  const dom = await createForm();
  let restored;
  try {
    const { document } = dom.window;
    const image = 'data:image/png;base64,c25hcHNob3RpbWFnZQ==';
    const html = `<p>Comment <img src="${image}"></p>`;
    document.getElementById('checkerComments').value = html;
    document.querySelector('#checkerComments-editor .ql-editor').innerHTML = html;
    document.body.insertAdjacentHTML('beforeend', '<script type="application/json" data-snapshot-form-state>{"old":true}</script>');
    let snapshot;
    dom.window.Blob = class {
      constructor (parts) { snapshot = parts.join(''); }
    };
    dom.window.URL.createObjectURL = () => 'blob:test';
    dom.window.URL.revokeObjectURL = () => {};
    dom.window.HTMLAnchorElement.prototype.click = () => {};
    dom.window.__checkFormInstance.saveSnapshot();

    assert.equal(snapshot.split(image).length - 1, 2);
    assert.equal(document.querySelector('#checkerComments-editor img').getAttribute('src'), image);
    restored = await createForm(snapshot);
    const restoredDocument = restored.window.document;
    assert.equal(restoredDocument.querySelectorAll('script[data-snapshot-form-state]').length, 1);
    assert.equal(restoredDocument.querySelector('#checkerComments-editor img').getAttribute('src'), image);
    assert.equal(restoredDocument.getElementById('checkerComments').value, html);
    let resaved;
    restored.window.Blob = class {
      constructor (parts) { resaved = parts.join(''); }
    };
    restored.window.URL.createObjectURL = () => 'blob:test';
    restored.window.URL.revokeObjectURL = () => {};
    restored.window.HTMLAnchorElement.prototype.click = () => {};
    restored.window.__checkFormInstance.saveSnapshot();
    assert.equal(resaved.split(image).length - 1, 2);
    assert.equal((resaved.match(/<script type="application\/json" data-snapshot-form-state/g) || []).length, 1);
  } finally {
    restored?.window.close();
    dom.window.close();
  }
});

test('a saved fallback editor reopens and continues updating its hidden field', async () => {
  const dom = await createForm();
  let restored;
  try {
    const { document } = dom.window;
    const container = document.getElementById('checkerComments-editor');
    const wrapper = container.closest('.rich-text-wrapper');
    container.removeAttribute('id');
    container.hidden = true;
    wrapper.classList.add('comments-editor-fallback');
    wrapper.insertAdjacentHTML('beforeend', '<div id="checkerComments-editor" class="comments-inline-editor" data-editor-bound="1">Saved comment</div>');
    document.getElementById('checkerComments').value = '<p>Saved comment</p>';
    let snapshot;
    dom.window.Blob = class {
      constructor (parts) { snapshot = parts.join(''); }
    };
    dom.window.URL.createObjectURL = () => 'blob:test';
    dom.window.URL.revokeObjectURL = () => {};
    dom.window.HTMLAnchorElement.prototype.click = () => {};
    dom.window.__checkFormInstance.saveSnapshot();
    snapshot = snapshot.replace('      #loadDependencies () {', '      #loadDependencies () { return Promise.reject(new Error("offline"));');

    restored = await createForm(snapshot);
    const editor = restored.window.document.getElementById('checkerComments-editor');
    assert.equal(editor.textContent, 'Saved comment');
    editor.dispatchEvent(new restored.window.FocusEvent('focusin', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(editor.hidden, false);
    editor.innerHTML = '<p>Updated comment</p>';
    editor.dispatchEvent(new restored.window.Event('input', { bubbles: true }));
    assert.equal(restored.window.document.getElementById('checkerComments').value, '<p>Updated comment</p>');
    assert.equal(restored.window.document.querySelectorAll('.comments-inline-editor').length, 2);
  } finally {
    restored?.window.close();
    dom.window.close();
  }
});

test('PDF image conversions run sequentially across signatures and comments', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108.html'), 'utf8')
    .replace(
      "      async #imageForPdf (dataUrl, description, { maxWidth = 1200, type = 'image/png' } = {}) {",
      "      async #imageForPdf (dataUrl, description, { maxWidth = 1200, type = 'image/png' } = {}) {\n" +
      "        window.imageConversions = (window.imageConversions || 0) + 1;\n" +
      "        window.activeImages = (window.activeImages || 0) + 1;\n" +
      "        window.maxActiveImages = Math.max(window.maxActiveImages || 0, window.activeImages);\n" +
      "        await new Promise(resolve => setTimeout(resolve, 5));\n" +
      "        window.activeImages -= 1;\n" +
      "        return dataUrl;"
    );
  const dom = await createForm(source);
  try {
    const { document, __checkFormInstance: form } = dom.window;
    document.querySelector('.risk-btn[data-risk="high"]').click();
    const image = 'data:image/png;base64,YQ==';
    document.getElementById('sc_sig_data').value = image;
    document.getElementById('ch_sig_data').value = image;
    for (const id of ['checkerComments', 'engineerResponse']) {
      document.querySelector(`#${id}-editor .ql-editor`).innerHTML = `<p><img src="${image}"></p>`;
    }
    const pdf = await form.buildPdfForTest();
    assert.ok(pdf.content.length > 0);
    assert.equal(dom.window.imageConversions, 4);
    assert.equal(dom.window.maxActiveImages, 1);
  } finally {
    dom.window.close();
  }
});
