const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');

test('PDF places direct supervision between the self-check and its signature', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261102.html'), 'utf8');
    const marker = '        async #buildPdfDefinition () {';
    assert.ok(source.includes(marker));
    const html = source.replace(marker, '        buildPdfForTest () { return this.#buildPdfDefinition(); }\n' + marker);
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => errors.push(error));
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      virtualConsole,
      beforeParse (window) {
        window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect () {} });
        window.fetch = async () => ({ ok: false });
        window.CSS = { escape: (value) => value };
      }
    });

    try {
      await new Promise((resolve) => dom.window.addEventListener('load', resolve, { once: true }));
      const doc = dom.window.document;
      const form = dom.window.__checkFormInstance;
      assert.equal(form.hasData({ commentsImages: [], responseImages: [] }), false);
      assert.equal(form.hasData({ commentsImages: ['image'], responseImages: [] }), true);
      const reviewData = {
        checklist: [],
        comments: 'Comment text\nSecond line',
        response: 'Response text',
        commentsImages: ['data:image/png;base64,comment'],
        responseImages: ['data:image/png;base64,response']
      };
      for (const buildSection of ['buildSection3_Check', 'buildSection4_PeerReview', 'buildSection5_IndependentReview']) {
        const review = form[buildSection](reviewData);
        const block = review.stack.find((item) => item.stack?.[0]?.table?.body?.[0]?.[0]?.text === 'Comments & Corrections');
        assert.ok(block, `${buildSection} should contain a comments table`);
        const table = block.stack[0].table;
        assert.equal(block.stack[0].id, 'keep-table:comments');
        const signature = review.stack.find((item) => item.id?.startsWith('keep-table:signature:'));
        assert.ok(signature, `${buildSection} should contain a protected signature table`);
        const isSeal = buildSection === 'buildSection5_IndependentReview';
        assert.equal(signature.table.body[0][2].text, isSeal ? 'Signature and Seal' : 'Signature');
        assert.equal(signature.table.heights(1), isSeal ? 86 : 40);
        assert.equal(signature.table.body[1][2].id, `sigfield:${isSeal ? 'ir' : buildSection === 'buildSection3_Check' ? 'ch' : 'pr'}_digital_signature`);
        assert.equal(table.widths.length, 2);
        assert.equal(table.body[0][1].text, 'Engineer Response');
        assert.equal(table.body[0][0].fillColor, '#EDEDED');
        assert.equal(table.body[1][0].stack[0].text, reviewData.comments);
        assert.equal(table.body[1][1].stack[0].text, reviewData.response);
        assert.equal(table.body[1][0].stack[1].image, reviewData.commentsImages[0]);
        assert.equal(table.body[1][1].stack[1].image, reviewData.responseImages[0]);
        assert.equal(block.stack[0].layout.hLineColor(), '#BFBFBF');
      }
      const emptyComments = form.buildCommentsBlock('', '');
      const signedSeal = form.buildSection5_IndependentReview({ ...reviewData, signature: 'data:image/png;base64,test' })
        .stack.find((item) => item.id === 'keep-table:signature:ir');
      assert.equal(signedSeal.table.body.length, 2);
      assert.equal(signedSeal.table.body[1][2].image, 'data:image/png;base64,test');
      assert.equal(signedSeal.table.body[1][2].id, undefined);
      assert.equal(signedSeal.table.heights(1), 86);
      assert.equal(emptyComments.stack[0].table.body[1][0].stack[0].text, 'None');
      assert.equal(emptyComments.stack[0].table.body[1][1].stack[0].text, 'None');
      assert.equal(emptyComments.stack.length, 1);
      doc.getElementById('engineer').value = 'Test Engineer';
      const assertEngineerLabel = async (label) => {
        const definition = await form.buildPdfForTest();
        const workInfo = definition.content.find((section) => section.stack?.[0]?.text === 'Work Information');
        const rows = workInfo.stack[1].table.body;
        const row = rows.find((entry) => entry[1].text === 'Test Engineer');
        assert.ok(row);
        assert.equal(row[0].text, label);
      };
      const selfCheck = async () => {
        const definition = await form.buildPdfForTest();
        return definition.content.find((section) => section.stack?.[0]?.text === '1. Self-Check');
      };

      await assertEngineerLabel('Engineer');
      let section = await selfCheck();
      assert.equal(section.stack.length, 3);
      assert.equal(section.stack[2].table.body[0][2].text, 'Signature');

      doc.getElementById('sc_role_eit').click();
      await assertEngineerLabel('Engineer-in-Training');
      section = await selfCheck();
      assert.equal(section.stack.length, 4);
      assert.equal(section.stack[2].stack[0].text, '2. Direct Supervision');
      assert.equal(section.stack[2].stack[1].table.body.length, 6);
      assert.equal(section.stack[3].table.body[0][2].text, 'Signature');

      doc.getElementById('ds1_yes').click();
      doc.getElementById('sc_role_eng').click();
      await assertEngineerLabel('Engineer');
      assert.equal(doc.getElementById('card-ds').classList.contains('hidden'), true);
      section = await selfCheck();
      assert.equal(section.stack.length, 3);
      assert.equal(section.stack[2].table.body[0][2].text, 'Signature');
      assert.deepEqual(errors, []);
    } finally {
      dom.window.close();
    }
  });

  test('PDF table pagination uses the existing renderer without losing oversized comments', {
    skip: !process.env.PDFMAKE_PATH || !process.env.PDFMAKE_FONTS_PATH
  }, async () => {
    const pdfMake = require(process.env.PDFMAKE_PATH);
    pdfMake.addVirtualFileSystem(require(process.env.PDFMAKE_FONTS_PATH));
    const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261102.html'), 'utf8');
    const marker = '        async #buildPdfDefinition () {';
    const html = source.replace(marker, '        buildPdfForTest () { return this.#buildPdfDefinition(); }\n        signatureFieldsForTest () { return this.#sigFields; }\n' + marker);
    const dom = new JSDOM(html, {
      runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: new VirtualConsole(),
      beforeParse (window) {
        window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect () {} });
        window.fetch = async () => ({ ok: false });
        window.CSS = { escape: (value) => value };
      }
    });
    try {
      await new Promise((resolve) => dom.window.addEventListener('load', resolve, { once: true }));
      const form = dom.window.__checkFormInstance;
      const render = async (block, spacerHeight) => {
        const def = await form.buildPdfForTest();
        def.content = [{ canvas: [{ type: 'rect', x: 0, y: 0, w: 1, h: spacerHeight }] }, block];
        return new Promise((resolve) => pdfMake.createPdf(def)._getPages({}, resolve));
      };
      const pagesForText = (pages, text) => pages.flatMap((page, index) =>
        page.items.some((item) => item.item?.inlines?.map((inline) => inline.text).join('').includes(text)) ? [index + 1] : []);
      const comment = form.buildCommentsBlock('CommentMarker', 'ResponseMarker');
      let pages = await render(comment, 725);
      assert.deepEqual(pagesForText(pages, 'Comments & Corrections'), [2]);
      assert.deepEqual(pagesForText(pages, 'CommentMarker'), [2]);
      assert.deepEqual(pagesForText(pages, 'ResponseMarker'), [2]);
      for (let height = 685; height <= 745; height++) {
        pages = await render(form.buildCommentsBlock('CommentMarker', 'ResponseMarker'), height);
        const headerPage = pagesForText(pages, 'Comments & Corrections')[0];
        assert.equal(pagesForText(pages, 'CommentMarker')[0], headerPage, `comment contents at spacer ${height}`);
        const borderPages = pages.flatMap((page, index) =>
          page.items.filter((item) => item.type === 'vector').length > (index === 0 ? 1 : 0) ? [index + 1] : []);
        assert.deepEqual(borderPages, [headerPage], `comment borders at spacer ${height}`);
      }

      const signature = form.buildSignatureBlock('SignatureMarker', '2026-01-01', '', 'Tester', 'test');
      pages = await render(signature, 705);
      assert.deepEqual(pagesForText(pages, 'Tester Name'), [2]);
      assert.deepEqual(pagesForText(pages, 'SignatureMarker'), [2]);
      assert.equal(pages[0].items.filter((item) => item.type === 'vector').length, 1);
      assert.ok(pages[1].items.filter((item) => item.type === 'vector').length > 1);
      const field = form.signatureFieldsForTest().find((item) => item.name === 'test_digital_signature');
      assert.equal(field.page, 2);
      assert.ok(field.top >= 40 && field.top < 150);
      assert.ok(field.left >= 315 && field.left <= 320, JSON.stringify(field));
      assert.ok(field.width >= 235 && field.width <= 240, JSON.stringify(field));
      assert.equal(field.height, 46);
      for (let height = 685; height <= 745; height++) {
        pages = await render(form.buildSignatureBlock('SignatureMarker', '2026-01-01', '', 'Tester', 'test'), height);
        const headerPage = pagesForText(pages, 'Tester Name')[0];
        assert.equal(pagesForText(pages, 'SignatureMarker')[0], headerPage, `signature contents at spacer ${height}`);
        const borderPages = pages.flatMap((page, index) =>
          page.items.filter((item) => item.type === 'vector').length > (index === 0 ? 1 : 0) ? [index + 1] : []);
        assert.deepEqual(borderPages, [headerPage], `signature borders at spacer ${height}`);
        const widget = form.signatureFieldsForTest().find((item) => item.name === 'test_digital_signature');
        assert.equal(widget.page, headerPage, `signature field at spacer ${height}`);
      }

      for (let height = 635; height <= 715; height++) {
        const seal = form.buildSection5_IndependentReview({ checklist: [], comments: '', response: '', name: 'SealMarker' })
          .stack.find((item) => item.id === 'keep-table:signature:ir');
        pages = await render(seal, height);
        const headerPage = pagesForText(pages, 'Signature and Seal')[0];
        assert.ok(headerPage, `seal heading at spacer ${height}`);
        assert.equal(pagesForText(pages, 'SealMarker')[0], headerPage, `seal contents at spacer ${height}`);
        const borderPages = pages.flatMap((page, index) =>
          page.items.filter((item) => item.type === 'vector').length > (index === 0 ? 1 : 0) ? [index + 1] : []);
        assert.deepEqual(borderPages, [headerPage], `seal borders at spacer ${height}`);
        const widget = form.signatureFieldsForTest().find((item) => item.name === 'ir_digital_signature');
        assert.equal(widget.page, headerPage, `seal field page at spacer ${height}`);
        assert.equal(widget.height, field.height * 2, `seal field height at spacer ${height}`);
        assert.equal(widget.width, field.width);
        assert.equal(widget.left, field.left);
      }

      const longText = Array.from({ length: 130 }, (_, index) => `Entry${String(index).padStart(3, '0')}`).join('\n');
      pages = await render(form.buildCommentsBlock(longText, 'ResponseMarker'), 400);
      assert.ok(pagesForText(pages, 'Entry000').length);
      assert.ok(pagesForText(pages, 'Entry129').length);
      assert.ok(pagesForText(pages, 'Entry129')[0] > pagesForText(pages, 'Entry000')[0]);
      const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=';
      const signedSeal = form.buildSection5_IndependentReview({
        checklist: [], comments: '', response: '', name: 'SealMarker', signature: png
      }).stack.find((item) => item.id === 'keep-table:signature:ir');
      pages = await render(signedSeal, 675);
      assert.deepEqual(pagesForText(pages, 'Signature and Seal'), [2]);
      assert.equal(pages[1].items.filter((item) => item.type === 'image').length, 1);
      assert.equal(form.signatureFieldsForTest().some((item) => item.name === 'ir_digital_signature'), false);
      pages = await render(form.buildCommentsBlock('ScreenshotMarker', '', [png], []), 610);
      assert.equal(pagesForText(pages, 'ScreenshotMarker')[0], pagesForText(pages, 'Comments & Corrections')[0]);
      assert.equal(pages.findIndex((page) => page.items.some((item) => item.type === 'image')) + 1,
        pagesForText(pages, 'ScreenshotMarker')[0]);
      assert.equal(pages.flatMap((page) => page.items.filter((item) => item.type === 'image')).length, 1);
      pages = await render(form.buildCommentsBlock('ScreenshotMarker', '', Array(6).fill(png), []), 400);
      assert.equal(pages.flatMap((page) => page.items.filter((item) => item.type === 'image')).length, 6);
    } finally {
      dom.window.close();
    }
  });

test('CDN assets retry alternate URLs on failure or invalid scripts', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261102.html'), 'utf8');
  const marker = '      // 3. Sanitization';
  const html = source.replace(marker, '      window.testLoadCdnAsset = loadCdnAsset;\n' + marker);
  const requests = [];
  let mode = 'fallback';
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://example.test/', virtualConsole: new VirtualConsole(),
    beforeParse (window) {
      window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect () {} });
      const append = window.HTMLHeadElement.prototype.appendChild;
      window.HTMLHeadElement.prototype.appendChild = function (element) {
        const result = append.call(this, element);
        if (element.tagName !== 'SCRIPT' && !(element.tagName === 'LINK' && element.rel === 'stylesheet')) return result;
        const url = element.src || element.href;
        requests.push(url);
        window.queueMicrotask(() => {
          if (mode === 'fail' || (mode === 'fallback' && url.startsWith('https://cdn.jsdelivr.net/'))) {
            element.onerror?.();
          } else {
            element.onload?.();
          }
        });
        return result;
      };
    }
  });
  try {
    await new Promise((resolve) => dom.window.addEventListener('load', resolve, { once: true }));
    const assets = {
      QUILL_JS: '/sites/de/SiteAssets/js/quill.js',
      QUILL_CSS: '/sites/de/SiteAssets/css/quill.snow.css',
      DOMPURIFY_JS: '/sites/de/SiteAssets/js/purify.min.js',
      PDFMAKE_JS: '/sites/de/SiteAssets/js/pdfmake.min.js',
      PDFMAKE_FONTS_JS: '/sites/de/SiteAssets/js/vfs_fonts.js',
      PDFLIB_JS: '/sites/de/SiteAssets/js/pdf-lib.min.js'
    };
    for (const [key, alternate] of Object.entries(assets)) {
      requests.length = 0;
      await dom.window.testLoadCdnAsset(key, key.endsWith('_CSS') ? 'stylesheet' : 'script', 100);
      assert.equal(requests.length, 2);
      assert.ok(requests[0].startsWith('https://cdn.jsdelivr.net/'));
      assert.equal(new URL(requests[1]).pathname, alternate);
    }
    mode = 'primary';
    requests.length = 0;
    await dom.window.testLoadCdnAsset('QUILL_JS', 'script', 100);
    assert.equal(requests.length, 1);
    requests.length = 0;
    let checks = 0;
    await dom.window.testLoadCdnAsset('PDFMAKE_JS', 'script', 100, () => ++checks === 2);
    assert.equal(requests.length, 2, 'invalid primary script retries alternate');
    mode = 'fail';
    const existingPdfLibScripts = dom.window.document.querySelectorAll('script[src*="pdf-lib"]').length;
    await assert.rejects(dom.window.testLoadCdnAsset('PDFLIB_JS', 'script', 100), /Failed to load .*pdf-lib/);
    assert.equal(dom.window.document.querySelectorAll('script[src*="pdf-lib"]').length, existingPdfLibScripts);
    mode = 'timeout';
    const append = dom.window.document.head.appendChild;
    dom.window.document.head.appendChild = function (element) {
      if (mode === 'timeout' && element.tagName === 'SCRIPT') {
        requests.push(element.src);
        return element;
      }
      return append.call(this, element);
    };
    requests.length = 0;
    await assert.rejects(dom.window.testLoadCdnAsset('PDFLIB_JS', 'script', 5), /Timeout loading/);
    assert.equal(requests.length, 2, 'timeout retries alternate');
  } finally {
    dom.window.close();
  }
});

test('comment editor loads alternate scripts and stylesheet together', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261102.html'), 'utf8');
  const html = source
    .replace('        #loadDependencies () {', '        loadDependenciesForTest () { return this.#loadDependencies(); }\n        #loadDependencies () {')
    .replace('      class CheckForm {', '      window.TestCommentEditorManager = CommentEditorManager;\n      class CheckForm {');
  const requests = [];
  let failCss = false;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://example.test/', virtualConsole: new VirtualConsole(),
    beforeParse (window) {
      window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect () {} });
      const append = window.HTMLHeadElement.prototype.appendChild;
      window.HTMLHeadElement.prototype.appendChild = function (element) {
        const result = append.call(this, element);
        const url = element.src || element.href;
        if (!url) return result;
        requests.push(url);
        window.queueMicrotask(() => {
          if (url.startsWith('https://cdn.jsdelivr.net/') || (failCss && url.endsWith('quill.snow.css'))) {
            element.onerror?.();
          } else {
            if (url.endsWith('quill.js')) window.Quill = function () {};
            if (url.endsWith('purify.min.js')) window.DOMPurify = { sanitize: (value) => value };
            element.onload?.();
          }
        });
        return result;
      };
    }
  });
  try {
    await new Promise((resolve) => dom.window.addEventListener('load', resolve, { once: true }));
    const manager = new dom.window.TestCommentEditorManager({});
    await manager.loadDependenciesForTest();
    for (const suffix of ['quill.js', 'purify.min.js', 'quill.snow.css']) {
      assert.equal(requests.filter((url) => url.endsWith(suffix)).length, 2);
    }
    failCss = true;
    await assert.rejects(manager.loadDependenciesForTest(), /Failed to load .*quill\.snow\.css/);
  } finally {
    dom.window.close();
  }
});

test('PDF export retries alternate libraries and reports failed signature dependencies', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261102.html'), 'utf8');
  const requests = [];
  const messages = [];
  let downloaded = 0;
  let failPdfLib = false;
  let fieldWasAdded = false;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://example.test/', virtualConsole: new VirtualConsole(),
    beforeParse (window) {
      window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect () {} });
      window.CSS = { escape: (value) => value };
      window.fetch = async () => ({ ok: false });
      window.URL.createObjectURL = () => 'blob:test';
      window.URL.revokeObjectURL = () => {};
      window.HTMLAnchorElement.prototype.click = () => { downloaded++; };
      const append = window.HTMLHeadElement.prototype.appendChild;
      window.HTMLHeadElement.prototype.appendChild = function (element) {
        const result = append.call(this, element);
        const url = element.src || element.href;
        if (!url) return result;
        requests.push(url);
        window.queueMicrotask(() => {
          if (url.startsWith('https://cdn.jsdelivr.net/') || (failPdfLib && url.endsWith('pdf-lib.min.js'))) {
            element.onerror?.();
            return;
          }
          if (url.endsWith('pdfmake.min.js')) {
            window.pdfMake = { createPdf: (definition) => ({
              getBuffer: (callback) => {
                definition.pageBreakBefore({
                  id: 'sigfield:sc_digital_signature',
                  startPosition: { pageNumber: 1, pageInnerWidth: 515, left: 320, top: 100 }
                });
                callback(new Uint8Array([37, 80, 68, 70]));
              }
            }) };
          }
          if (url.endsWith('pdf-lib.min.js')) {
            window.PDFLib = {
              PDFDocument: { load: async () => ({
                context: { obj: (value) => value, register: (value) => value },
                getPages: () => [{ getHeight: () => 842, node: { addAnnot: () => { fieldWasAdded = true; } } }],
                catalog: { set () {} },
                save: async () => new Uint8Array([37, 80, 68, 70])
              }) },
              PDFName: { of: (value) => value },
              PDFString: { of: (value) => value }
            };
          }
          element.onload?.();
        });
        return result;
      };
    }
  });
  try {
    await new Promise((resolve) => dom.window.addEventListener('load', resolve, { once: true }));
    const form = dom.window.__checkFormInstance;
    form.pdfValidation = () => true;
    form.toast = (message) => messages.push(message);
    await form.exportPdf();
    for (const suffix of ['pdfmake.min.js', 'vfs_fonts.js', 'pdf-lib.min.js']) {
      assert.equal(requests.filter((url) => url.endsWith(suffix)).length, 2, suffix);
    }
    assert.equal(downloaded, 1);
    assert.equal(fieldWasAdded, true);
    assert.equal(messages.at(-1), 'PDF saved successfully');
    delete dom.window.PDFLib;
    failPdfLib = true;
    await form.exportPdf();
    assert.equal(downloaded, 1, 'a PDF without required signature fields must not be downloaded');
    assert.equal(messages.at(-1), 'Could not add PDF signature fields.');
  } finally {
    dom.window.close();
  }
});

test('role changes keep self-check answers and progress synchronized', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261102.html'), 'utf8');
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => errors.push(error));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    virtualConsole,
    beforeParse (window) {
      window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect () {} });
    }
  });

  try {
    await new Promise((resolve) => dom.window.addEventListener('load', resolve, { once: true }));
    const doc = dom.window.document;
    const form = dom.window.__checkFormInstance;
    const badge = () => doc.getElementById('badge-1').textContent.trim();
    const select = (id) => doc.getElementById(id).click();

    assert.ok(form);
    assert.equal(badge(), '0 / 11');
    select('sc_role_eit');
    assert.equal(doc.getElementById('sc11_no').checked, true);
    assert.equal(badge(), '1 / 11');
    assert.equal(doc.getElementById('progressPct').textContent, '6');
    select('sc1_yes');
    form.updateProgress();
    assert.equal(badge(), '2 / 11');
    select('sc11_yes');
    assert.equal(doc.getElementById('sc11_yes').checked, true);
    assert.equal(form.formState.sc[11], 'yes');
    assert.equal(badge(), '2 / 11');
    select('sc_role_eng');
    assert.equal(doc.getElementById('sc11_no').checked, false);
    assert.equal(doc.getElementById('sc11_yes').checked, false);
    assert.equal(form.formState.sc[11], undefined);
    assert.equal(form.formState.sc[1], 'yes');
    assert.equal(badge(), '1 / 11');
    assert.equal(doc.getElementById('progressPct').textContent, '9');
    select('sc_role_eit');
    assert.equal(form.formState.sc[11], 'no');
    assert.equal(badge(), '2 / 11');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('Save PDF remains available after browser print removal', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261102.html'), 'utf8');
  assert.doesNotMatch(source, /window\.print\s*\(|beforeprint|@media\s+print|saveAsPdfBtn|Print \/ PDF/);
  const html = source.replace('let pdfMakeFontsLoaded = false;', 'let pdfMakeFontsLoaded = true;');
  let definitions = 0;
  let downloaded = '';
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    virtualConsole: new VirtualConsole(),
    beforeParse (window) {
      window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect () {} });
      window.fetch = async () => ({ ok: false });
      window.CSS = { escape: (value) => value };
      window.pdfMake = {
        createPdf (definition) {
          definitions++;
          assert.ok(definition.content.length > 0);
          return { getBuffer: (callback) => callback(new Uint8Array([37, 80, 68, 70])) };
        }
      };
      window.URL.createObjectURL = () => 'blob:test';
      window.URL.revokeObjectURL = () => {};
      window.HTMLAnchorElement.prototype.click = function () { downloaded = this.download; };
    }
  });
  try {
    await new Promise((resolve) => dom.window.addEventListener('load', resolve, { once: true }));
    const doc = dom.window.document;
    const form = dom.window.__checkFormInstance;
    assert.equal(doc.getElementById('saveAsPdfBtn'), null);
    const button = doc.getElementById('exportPdfBtn');
    assert.ok(button);
    button.click();
    assert.equal(definitions, 0, 'incomplete forms still fail validation');
    form.pdfValidation = () => true;
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(definitions, 1);
    assert.equal(downloaded, 'DE_CheckForm.pdf');
    assert.equal(button.disabled, false);
    assert.equal(button.textContent.includes('Save PDF'), true);
    const messages = [];
    form.toast = (message) => messages.push(message);
    dom.window.pdfMake.createPdf = () => { throw new Error('test failure'); };
    await form.exportPdf();
    assert.equal(messages.at(-1), 'Could not create the PDF. Please try again.');
    assert.equal(button.disabled, false);
  } finally {
    dom.window.close();
  }
});

test('PDF includes only visible and expanded cards, including nested direct supervision', async () => {
      const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261102.html'), 'utf8');
      const marker = '        async #buildPdfDefinition () {';
      const html = source.replace(marker, '        buildPdfForTest () { return this.#buildPdfDefinition(); }\n' + marker);
      const dom = new JSDOM(html, {
        runScripts: 'dangerously',
        url: 'http://localhost/',
        virtualConsole: new VirtualConsole(),
        beforeParse (window) {
          window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect () {} });
          window.fetch = async () => ({ ok: false });
          window.CSS = { escape: (value) => value };
        }
      });
      try {
        await new Promise((resolve) => dom.window.addEventListener('load', resolve, { once: true }));
        const doc = dom.window.document;
        const form = dom.window.__checkFormInstance;
        const cards = [
          ['card-info', 'sec-info-head', 'sec-info-body', 'Work Information'],
          ['card-sc', 'sec1-head', 's1', '1. Self-Check'],
          ['card-ds', 'sec2-head', 's2', '2. Direct Supervision'],
          ['card-ch', 'sec3-head', 's3', '3. Check'],
          ['card-pr', 'sec4-head', 's4', '4. Peer Review'],
          ['card-ir', 'sec5-head', 's5', '5. Independent Structural Review'],
          ['card-final', 'sec6-head', 's6', '6. Appoint Tier 1 Reviewer & Team Lead Signatures']
        ];
        const setCard = ([card, head, body], visible, open) => {
          doc.getElementById(card).classList.toggle('hidden', !visible);
          doc.getElementById(head).classList.toggle('open', open);
          doc.getElementById(body).classList.toggle('open', open);
        };
        const titles = async () => {
          const definition = await form.buildPdfForTest();
          const result = [];
          const visit = (node) => {
            if (node?.stack?.[0]?.style === 'sectionTitle') result.push(node.stack[0].text);
            if (Array.isArray(node?.stack)) node.stack.forEach(visit);
          };
          definition.content.forEach(visit);
          return result;
        };
        cards.forEach((card) => setCard(card, true, true));
        doc.getElementById('sc1_yes').checked = true;
        doc.getElementById('ds1_yes').checked = true;
        doc.getElementById('ch1_yes').checked = true;
        doc.getElementById('pr1_yes').checked = true;
        doc.getElementById('ir1_yes').checked = true;
        doc.getElementById('fT1_name').value = 'Saved reviewer';
        const allTitles = cards.map((card) => card[3]);
        assert.deepEqual(await titles(), allTitles);

        for (const card of cards) {
          setCard(card, true, false);
          const excluded = card[0] === 'card-sc' ? ['1. Self-Check', '2. Direct Supervision'] : [card[3]];
          assert.deepEqual(await titles(), allTitles.filter((title) => !excluded.includes(title)), `${card[0]} collapsed`);
          setCard(card, false, true);
          assert.deepEqual(await titles(), allTitles.filter((title) => !excluded.includes(title)), `${card[0]} hidden`);
          setCard(card, true, true);
        }

        form.toggleSection(doc.getElementById('sec3-head'));
        assert.ok(!(await titles()).includes('3. Check'));
        form.toggleSection(doc.getElementById('sec3-head'));
        assert.ok((await titles()).includes('3. Check'));

        doc.getElementById('sec3-head').classList.remove('open');
        assert.ok(!(await titles()).includes('3. Check'));
        doc.getElementById('sec3-head').classList.add('open');
        doc.getElementById('s3').classList.remove('open');
        assert.ok(!(await titles()).includes('3. Check'));
        doc.getElementById('s3').classList.add('open');

        doc.getElementById('checkerComments-editor').innerHTML = '<div class="ql-editor"><img src="https://example.invalid/image.png"></div>';
        doc.getElementById('ch_sig_data').value = 'invalid signature';
        setCard(cards[3], true, false);
        assert.ok(!(await titles()).includes('3. Check'));
        setCard(cards[3], true, true);
        doc.getElementById('ch_sig_data').value = '';
        await assert.rejects(form.buildPdfForTest(), /not an embedded image/);
      } finally {
        dom.window.close();
      }
    });

test('PDF includes embedded screenshots from all comment editors and saved HTML', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261102.html'), 'utf8');
    const marker = '        async #buildPdfDefinition () {';
    const html = source.replace(marker, '        syncCommentsForTest () { this.#comments.syncAllHidden(); }\n        buildPdfForTest () { return this.#buildPdfDefinition(); }\n' + marker);
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      virtualConsole: new VirtualConsole(),
      beforeParse (window) {
        window.fetch = async () => ({ ok: false });
        window.CSS = { escape: (value) => value };
        window.Image = class {
          constructor () {
            this.naturalWidth = 100;
            this.naturalHeight = 50;
          }
          set src (value) {
            this.source = value;
            window.queueMicrotask(() => value.includes('invalid') ? this.onerror() : this.onload());
          }
        };
        window.HTMLCanvasElement.prototype.getContext = function () {
          return {
            clearRect () {},
            drawImage: (image) => { this.imageSource = image.source; }
          };
        };
        window.HTMLCanvasElement.prototype.toDataURL = function () {
          return `data:image/png;base64,converted-${this.imageSource}`;
        };
      }
    });

    try {
      await new Promise((resolve) => dom.window.addEventListener('load', resolve, { once: true }));
      const doc = dom.window.document;
      const form = dom.window.__checkFormInstance;
      const fields = [
        'checkerComments', 'engineerResponse',
        'reviewerComments', 'engineerResponse_2',
        'id_reviewerComments', 'id_engineerResponse_2'
      ];
      fields.forEach((id, index) => {
        const container = doc.getElementById(`${id}-editor`);
        if (index === 0) {
          container.classList.add('comments-inline-editor');
          container.innerHTML = '<p>Fallback text<img src="data:image/webp;base64,first"><img src="data:image/png;base64,second"></p>';
        } else if (index < 4) {
          container.innerHTML = `<div class="ql-editor"><p>${index === 1 ? '' : 'Quill text'}<img src="data:image/jpeg;base64,${id}"></p></div>`;
        } else {
          doc.getElementById(id).value = `<p><img src="data:image/gif;base64,${id}"></p>`;
        }
      });
      for (const [card, head, body] of [
        ['card-ch', 'sec3-head', 's3'], ['card-pr', 'sec4-head', 's4'], ['card-ir', 'sec5-head', 's5']
      ]) {
        doc.getElementById(card).classList.remove('hidden');
        doc.getElementById(head).classList.add('open');
        doc.getElementById(body).classList.add('open');
      }
      doc.getElementById('sc_sig_data').value = 'data:image/png;base64,signature';
      form.syncCommentsForTest();
      assert.match(doc.getElementById('id_reviewerComments').value, /data:image\/gif/);
      const definition = await form.buildPdfForTest();
      const selfCheck = definition.content.find((section) => section.stack?.[0]?.text === '1. Self-Check');
      assert.ok(selfCheck.stack.some((item) => item.table?.body?.[1]?.[2]?.image?.includes('signature')));
      const reviewSections = definition.content.filter((section) =>
        section.stack?.some((item) => item.stack?.[0]?.table?.body?.[0]?.[0]?.text === 'Comments & Corrections'));
      assert.equal(reviewSections.length, 3);
      for (let sectionIndex = 0; sectionIndex < 3; sectionIndex++) {
        const block = reviewSections[sectionIndex].stack.find((item) =>
          item.stack?.[0]?.table?.body?.[0]?.[0]?.text === 'Comments & Corrections');
        const cells = block.stack[0].table.body[1];
        for (let column = 0; column < 2; column++) {
          const index = sectionIndex * 2 + column;
          const images = cells[column].stack.filter((entry) => entry.image);
          assert.equal(images.length, index === 0 ? 2 : 1);
          assert.ok(images[0].image.startsWith('data:image/png;base64,converted-data:image/'));
          assert.deepEqual(Array.from(images[0].fit), [230, 180]);
          if (index === 1 || index >= 4) assert.equal(cells[column].stack.some((entry) => entry.text === 'None'), false);
        }
      }
      assert.equal(reviewSections[0].stack.find((item) => item.stack?.[0]?.table?.body?.[0]?.[0]?.text === 'Comments & Corrections')
        .stack[0].table.body[1][0].stack[0].text, 'Fallback text');

      doc.getElementById('checkerComments-editor').innerHTML = '<img src="https://example.invalid/screenshot.png">';
      await assert.rejects(form.buildPdfForTest(), /not an embedded image/);
      doc.getElementById('checkerComments-editor').innerHTML = '<img src="data:image/png;base64,invalid">';
      await assert.rejects(form.buildPdfForTest(), /Could not read the checkerComments screenshot 1 image/);
    } finally {
      dom.window.close();
    }
});
