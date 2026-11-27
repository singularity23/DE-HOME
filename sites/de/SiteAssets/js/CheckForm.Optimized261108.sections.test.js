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

test('signature upload in the copy remains on the upload tab with a removable preview', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108 copy.html'), 'utf8');
  const dom = await createForm(source);
  let restored;
  try {
    const { document, __checkFormInstance: form } = dom.window;
    const file = new dom.window.File(['signature'], 'signature.png', { type: 'image/png' });
    for (const prefix of ['sc', 'ch']) {
      if (prefix === 'ch') answer(document, 'ch_c_yes');
      const input = document.getElementById(`${prefix}SigUpload`);
      const uploadTab = document.getElementById(`${prefix}SigUploadTab`);
      const uploadButton = document.getElementById(`${prefix}SigUploadBtn`);
      const drawTab = document.getElementById(`${prefix}SigDrawTab`);
      const drawButton = document.getElementById(`${prefix}SigDrawBtn`);
      const uploadArea = uploadTab.querySelector('.sig-upload-area');
      const hidden = document.getElementById(`${prefix}_sig_data`);
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      for (let i = 0; i < 100 && !hidden.value; i++) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      assert.equal(hidden.value, 'data:image/png;base64,c2lnbmF0dXJl');
      assert.equal(uploadButton.getAttribute('aria-selected'), 'true');
      assert.equal(drawButton.getAttribute('aria-selected'), 'false');
      assert.equal(uploadTab.classList.contains('active'), true);
      assert.equal(drawTab.classList.contains('active'), false);
      assert.equal(uploadArea.querySelector('img').getAttribute('src'), hidden.value);
      assert.equal(dom.window.getComputedStyle(uploadArea.querySelector('.sig-inline-preview')).display, 'flex');
      assert.equal(dom.window.getComputedStyle(uploadArea.querySelector('.image-thumbnail-remove')).display, 'flex');

      if (prefix === 'sc') {
        let snapshot;
        dom.window.Blob = class {
          constructor (parts) { snapshot = parts.join(''); }
        };
        dom.window.URL.createObjectURL = () => 'blob:test';
        dom.window.URL.revokeObjectURL = () => {};
        dom.window.HTMLAnchorElement.prototype.click = () => {};
        form.saveSnapshot();
        restored = await createForm(snapshot);
        const restoredDocument = restored.window.document;
        assert.equal(restoredDocument.getElementById('sc_sig_data').value, hidden.value);
        assert.equal(restoredDocument.querySelector('#scSigUploadTab img').getAttribute('src'), hidden.value);
        assert.equal(restoredDocument.querySelector('#scSigDrawTab img').getAttribute('src'), hidden.value);
      }

      uploadArea.querySelector('.image-thumbnail-remove').click();
      assert.equal(hidden.value, '');
      assert.equal(uploadArea.querySelector('img').hasAttribute('src'), false);
      assert.equal(uploadTab.classList.contains('active'), true);
      assert.equal(dom.window.getComputedStyle(uploadArea.querySelector('.image-thumbnail-remove')).display, 'none');

      form.setSignatureForTest(prefix, 'data:image/png;base64,ZHJhdw==');
      assert.equal(drawButton.getAttribute('aria-selected'), 'true');
      assert.equal(drawTab.classList.contains('active'), true);
      assert.equal(drawTab.querySelector('img').getAttribute('src'), hidden.value);
      assert.equal(uploadArea.querySelector('img').getAttribute('src'), hidden.value);
    }
  } finally {
    restored?.window.close();
    dom.window.close();
  }
});

for (const mode of ['uninitialized', 'fallback']) {
  test(`paired comment editors in the copy size independently (${mode})`, async () => {
    let source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108 copy.html'), 'utf8');
    if (mode === 'fallback') {
      source = source.replace('      #loadDependencies () {', '      #loadDependencies () { return Promise.reject(new Error("offline"));');
    }
    const dom = await createForm(source);
    try {
      const { document } = dom.window;
      const ids = ['checkerComments', 'engineerResponse'];
      const firstContainer = document.getElementById(`${ids[0]}-editor`);
      ids.forEach(id => document.getElementById(`${id}-editor`).closest('.comments-cell').classList.remove('hidden'));
      if (mode === 'fallback') {
        firstContainer.querySelector('.ql-editor').dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const editors = ids.map(id => {
        const container = document.getElementById(`${id}-editor`);
        return container.matches('.comments-inline-editor') ? container : container.querySelector('.ql-editor');
      });
      let firstHeight = 340;
      Object.defineProperty(editors[0], 'scrollHeight', { configurable: true, get: () => firstHeight });
      Object.defineProperty(editors[1], 'scrollHeight', { configurable: true, get: () => 180 });
      const eventType = mode === 'fallback' ? 'input' : 'change';
      editors[0].dispatchEvent(new dom.window.Event(eventType, { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 80));
      assert.deepEqual(editors.map(editor => editor.style.height), ['340px', '180px']);
      assert.equal(dom.window.getComputedStyle(editors[0].closest('.comments-grid')).gridTemplateRows, 'auto auto');

      firstHeight = 160;
      editors[0].dispatchEvent(new dom.window.Event(eventType, { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 80));
      assert.deepEqual(editors.map(editor => editor.style.height), ['160px', '180px']);
    } finally {
      dom.window.close();
    }
  });
}

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

test('medium risk tracks newly opened required fields and retains collapsed-section progress', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108 copy.html'), 'utf8');
  const dom = await createForm(source);
  try {
    const { document, __checkFormInstance: form } = dom.window;
    const enabledOpenFields = () => form.elements.allOpenRequired.filter(el => !el.previousSibling.disabled);
    document.querySelector('.risk-btn[data-risk="medium"]').click();
    const fields = enabledOpenFields();
    assert.equal(fields.length, 12);
    assert.ok(fields.some(el => el.previousElementSibling.id === 'ch-date'));
    assert.ok(fields.some(el => el.previousElementSibling.id === 'ch-name'));
    assert.equal(form.getReadinessState().pct, 12);

    document.getElementById('sec3-head').click();
    assert.equal(enabledOpenFields().length, 10);
    assert.equal(form.getReadinessState().pct, 12);
    document.getElementById('sec3-head').click();
    assert.equal(enabledOpenFields().length, 12);

    document.getElementById('ch-date').value = '2026-01-01';
    const beforeName = form.getReadinessState().pct;
    document.getElementById('ch-name').value = 'Checker';
    assert.ok(form.getReadinessState().pct > beforeName);
    document.querySelector('.risk-btn[data-risk="low"]').click();
    assert.equal(enabledOpenFields().some(el => el.previousElementSibling.id === 'ch-date'), false);
    document.querySelector('.risk-btn[data-risk="medium"]').click();
    assert.equal(enabledOpenFields().length, 12);
  } finally {
    dom.window.close();
  }
});

test('medium-risk progress includes incomplete fields in a collapsed Check section', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108 copy.html'), 'utf8');
  const dom = await createForm(source);
  try {
    const { document, __checkFormInstance: form } = dom.window;
    document.querySelector('.risk-btn[data-risk="medium"]').click();
    for (let n = 1; n <= 11; n++) answer(document, `sc${n}_${[8, 9, 10].includes(n) ? 'no' : 'yes'}`);
    for (let n = 1; n <= 10; n++) answer(document, `ch${n}_yes`);
    for (const [id, value] of Object.entries({
      workTitle: 'Test work',
      deliverable: 'Memo',
      engineer: 'Engineer',
      checker: 'Checker',
      'sc-date': '2026-01-01',
      'sc-name': 'Engineer',
      'ch-name': 'Checker',
    })) {
      document.getElementById(id).value = value;
    }

    document.getElementById('sec3-head').click();
    assert.equal(form.getReadinessState().pct, 97);
    assert.equal(form.getReadinessState().canSubmit, false);
    document.getElementById('ch-date').value = '2026-01-01';
    assert.equal(form.getReadinessState().pct, 100);
    assert.equal(form.getReadinessState().canSubmit, true);
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

test('PDF comments and responses in the copy are stacked for every review section', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108 copy.html'), 'utf8');
  const dom = await createForm(source);
  try {
    const { document, __checkFormInstance: form } = dom.window;
    document.querySelector('.risk-btn[data-risk="high"]').click();
    answer(document, 'sc9_yes');
    document.getElementById('sec4-head').click();
    const pairs = [
      ['checkerComments', 'engineerResponse'],
      ['reviewerComments', 'engineerResponse_2'],
      ['ind_reviewerComments', 'ind_engineerResponse_2'],
    ];
    for (const [comments, response] of pairs) {
      const extra = comments === 'checkerComments'
        ? Array.from({ length: 60 }, (_, i) => `<p>Long comment line ${i + 1}</p>`).join('')
        : '';
      document.querySelector(`#${comments}-editor .ql-editor`).innerHTML = `<p><strong>${comments}</strong></p>${extra}`;
      if (response !== 'ind_engineerResponse_2') {
        document.querySelector(`#${response}-editor .ql-editor`).innerHTML = `<p>${response}</p>`;
      }
    }

    const pdf = await form.buildPdfForTest();
    const blocks = [];
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      if (node.id === 'keep-table:comments') blocks.push(node);
      if (Array.isArray(node)) node.forEach(visit);
      else if (node.stack) visit(node.stack);
    };
    visit(pdf.content);
    assert.equal(blocks.length, 3);
    blocks.forEach((block, index) => {
      assert.deepEqual(Array.from(block.table.widths), ['*']);
      assert.equal(block.table.headerRows, undefined);
      const rows = block.table.body;
      assert.equal(rows.length, 4);
      assert.ok(rows.every(row => row.length === 1));
      assert.equal(rows[0][0].text, 'Comments & Corrections');
      assert.equal(rows[2][0].text, 'Engineer Response');
      assert.equal(rows[1][0].stack[0].text[0].text, pairs[index][0]);
      assert.equal(rows[1][0].stack[0].text[0].bold, true);
      if (index === 2) assert.equal(rows[3][0].stack[0].text, 'None');
      else assert.equal(rows[3][0].stack[0].text[0].text, pairs[index][1]);
    });

    const firstTable = blocks[0].table.body;
    firstTable[1][0].stack[0].id = 'test-comment-start';
    firstTable[1][0].stack.at(-1).id = 'test-comment-end';
    firstTable[3][0].stack[0].id = 'test-response';
    const positions = {};
    const pageBreakBefore = pdf.pageBreakBefore;
    pdf.pageBreakBefore = (node, container) => {
      if (node.id?.startsWith('test-') && node.startPosition) positions[node.id] = node.startPosition;
      return pageBreakBefore(node, container);
    };
    const pdfMake = require(path.join(__dirname, 'pdfmake.min.js'));
    pdfMake.addVirtualFileSystem(require(path.join(__dirname, 'vfs_fonts.js')));
    pdfMake.addFonts({
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf',
      },
    });
    const buffer = await pdfMake.createPdf(pdf).getBuffer();
    assert.ok(buffer.length > 0);
    assert.ok(positions['test-comment-end'].pageNumber > positions['test-comment-start'].pageNumber, JSON.stringify(positions));
    assert.ok(positions['test-response'].pageNumber >= positions['test-comment-end'].pageNumber);
    if (positions['test-response'].pageNumber === positions['test-comment-end'].pageNumber) {
      assert.ok(positions['test-response'].top > positions['test-comment-end'].top);
    }
  } finally {
    dom.window.close();
  }
});

test('PDF comment screenshots in the copy use the available width and fit on a page', async () => {
  const marker = "      async #imageForPdf (dataUrl, description, { maxWidth = 1200, maxHeight = 400, type = 'image/png' } = {}) {";
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108 copy.html'), 'utf8');
  assert.ok(source.includes(marker));
  const dom = await createForm(source.replace(marker, marker +
    "\n        (window.imageOptions ||= []).push({ description, maxWidth, maxHeight, type });\n        return dataUrl;"));
  try {
    const { document, __checkFormInstance: form } = dom.window;
    document.querySelector('.risk-btn[data-risk="medium"]').click();
    const landscape = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAC0lEQVR4nGNgAAMAAAcAAbKGrPQAAAAASUVORK5CYII=';
    const portrait = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAECAIAAADAusJtAAAAC0lEQVR4nGNgQAUAABAAATm9j2UAAAAASUVORK5CYII=';
    document.querySelector('#checkerComments-editor .ql-editor').innerHTML = `<p>Comment text</p><p><img src="${landscape}"></p>`;
    document.querySelector('#engineerResponse-editor .ql-editor').innerHTML = `<p>Response text</p><p><img src="${portrait}"></p>`;
    const pdf = await form.buildPdfForTest();
    const commentBlock = pdf.content.flatMap(section => section.stack || [])
      .flatMap(block => block.stack || [])
      .find(block => block.id === 'keep-table:comments');
    const commentNodes = commentBlock.table.body[1][0].stack;
    const responseNodes = commentBlock.table.body[3][0].stack;
    assert.equal(commentNodes[0].text[0].text, 'Comment text');
    assert.equal(responseNodes[0].text[0].text, 'Response text');
    const [wide, tall] = [commentNodes[1], responseNodes[1]];
    assert.equal(wide.image, landscape);
    assert.equal(tall.image, portrait);
    assert.ok(wide.fit[0] > 500);
    assert.ok(wide.fit[1] > 700);
    assert.ok(dom.window.imageOptions.every(options =>
      options.maxWidth === 2000 && options.maxHeight === 2000 && options.type === 'image/png'));

    wide.id = 'test-wide-image';
    tall.id = 'test-tall-image';
    const positions = {};
    const pageBreakBefore = pdf.pageBreakBefore;
    pdf.pageBreakBefore = (node, container) => {
      if (node.id?.startsWith('test-') && node.startPosition) positions[node.id] = node.startPosition;
      return pageBreakBefore(node, container);
    };
    const pdfMake = require(path.join(__dirname, 'pdfmake.min.js'));
    pdfMake.addVirtualFileSystem(require(path.join(__dirname, 'vfs_fonts.js')));
    pdfMake.addFonts({ Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    } });
    const buffer = await pdfMake.createPdf(pdf).getBuffer();
    assert.ok(buffer.length > 0);
    assert.ok(Math.abs(wide._width - wide.fit[0]) < 0.1);
    assert.ok(Math.abs(wide._width / wide._height - 2) < 0.001);
    assert.ok(Math.abs(tall._width / tall._height - 0.25) < 0.001);
    assert.ok(tall._height <= tall.fit[1]);
    for (const [image, id] of [[wide, 'test-wide-image'], [tall, 'test-tall-image']]) {
      assert.ok(positions[id]);
      assert.ok(positions[id].top + image._height <= pdf.pageMargins[1] + positions[id].pageInnerHeight + 0.1);
    }
  } finally {
    dom.window.close();
  }
});

test('PDF image conversion preserves screenshot detail and keeps signature limits', async () => {
  const marker = '      async #buildPdfDefinition () {';
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108 copy.html'), 'utf8')
    .replace(marker, '      imageForPdfForTest (url, opts) { return this.#imageForPdf(url, "test", opts); }\n' + marker);
  const dom = await createForm(source);
  try {
    let dimensions = [1200, 900];
    let rendered;
    dom.window.Image = class {
      constructor () { [this.naturalWidth, this.naturalHeight] = dimensions; }
      async decode () {}
    };
    dom.window.HTMLCanvasElement.prototype.getContext = function () {
      return { drawImage () {}, fillRect () { assert.fail('PNG transparency should be preserved'); } };
    };
    dom.window.HTMLCanvasElement.prototype.toDataURL = function (type) {
      rendered = { width: this.width, height: this.height, type };
      return 'data:image/png;base64,test';
    };
    const form = dom.window.__checkFormInstance;
    await form.imageForPdfForTest('data:image/png;base64,test', { maxWidth: 2000, maxHeight: 2000 });
    assert.deepEqual(rendered, { width: 1200, height: 900, type: 'image/png' });
    dimensions = [4000, 1000];
    await form.imageForPdfForTest('data:image/png;base64,test', { maxWidth: 2000, maxHeight: 2000 });
    assert.deepEqual(rendered, { width: 2000, height: 500, type: 'image/png' });
    dimensions = [1200, 900];
    await form.imageForPdfForTest('data:image/png;base64,test', { maxWidth: 480 });
    assert.deepEqual(rendered, { width: 480, height: 360, type: 'image/png' });
  } finally {
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
