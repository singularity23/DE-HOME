const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');
const pdfMake = require('./pdfmake.min.js');
const PDFLib = require('./pdf-lib.min.js');

const configurePdfMake = () => {
  pdfMake.addVirtualFileSystem(require('./vfs_fonts.js'));
  pdfMake.addFonts({
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  });
};

const getLaidOutPages = async definition => {
  const document = pdfMake.createPdf(definition);
  await document.getBuffer();
  return (await document.pdfDocumentPromise)._pdfMakePages;
};

test('generated PDF opens without PDF/A restrictions and retains signature fields', async () => {
  configurePdfMake();
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108.html'), 'utf8');
  const marker = '      async #buildPdfDefinition () {';
  assert.ok(source.includes(marker));
  const html = source.replace('<script type="module">', '<script>').replace(
    marker,
    '      buildPdfForTest () { return this.#buildPdfDefinition(); }\n' +
      '      addSignatureFieldsForTest (bytes) { return this.#addSignatureFields(bytes); }\n' +
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
      window.PDFLib = PDFLib;
    },
  });

  try {
    await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
    assert.deepEqual(errors, []);
    const form = dom.window.__checkFormInstance;
    const definition = await form.buildPdfForTest();
    assert.equal(definition.subset, undefined);
    const bytes = await pdfMake.createPdf(definition).getBuffer();
    const finalBytes = await form.addSignatureFieldsForTest(bytes);
    const pdf = await PDFLib.PDFDocument.load(finalBytes);
    assert.equal(pdf.isEncrypted, false);
    const metadata = pdf.catalog.lookup(PDFLib.PDFName.of('Metadata'));
    if (metadata) {
      const xml = new TextDecoder().decode(PDFLib.decodePDFRawStream(metadata).decode());
      assert.doesNotMatch(xml, /pdfaid:(part|conformance)/i);
    }
    const fields = pdf.catalog.lookup(PDFLib.PDFName.of('AcroForm')).lookup(PDFLib.PDFName.of('Fields'));
    const signatureNames = Array.from({ length: fields.size() }, (_, index) => {
      const field = fields.lookup(index);
      assert.equal(field.lookup(PDFLib.PDFName.of('FT')).asString(), '/Sig');
      return field.lookup(PDFLib.PDFName.of('T')).decodeText();
    });
    assert.ok(signatureNames.includes('sc_digital_signature'));
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('checklist section titles move with the checklist when there is not room for its first row', async () => {
  configurePdfMake();
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108.html'), 'utf8');
  const marker = '      async #buildPdfDefinition () {';
  assert.ok(source.includes(marker));
  const html = source.replace('<script type="module">', '<script>').replace(
    marker,
    '      buildPdfForTest () { return this.#buildPdfDefinition(); }\n' +
      '      checkSectionForTest (data) { return this.#buildCheckSection(data); }\n' +
      '      independentReviewForTest (data) { return this.#buildIndependentReviewSection(data); }\n' +
      marker
  );
  const virtualConsole = new VirtualConsole();
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

  try {
    await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
    const form = dom.window.__checkFormInstance;
    const pagesForText = (pages, text) => pages.flatMap((page, index) =>
      page.items.some(item => item.item?.inlines?.map(inline => inline.text).join('').includes(text)) ? [index + 1] : []);
    for (const [buildSection, title] of [
      ['checkSectionForTest', '3. Check'],
      ['independentReviewForTest', '5. Independent Structural Review'],
    ]) {
      const section = form[buildSection]({
        checklist: [{ question: 'First checklist item', answer: 'Yes' }],
        comments: '',
        response: '',
      });
      section.stack = section.stack.slice(0, 2);
      const definition = await form.buildPdfForTest();
      definition.content = [
        { canvas: [{ type: 'rect', x: 0, y: 0, w: 1, h: 770 }] },
        section,
      ];
      const pages = await getLaidOutPages(definition);
      assert.deepEqual(pagesForText(pages, title), [2], `${title} should move before the page break`);
      assert.deepEqual(pagesForText(pages, 'Checklist item'), [2], `${title} should stay with the checklist header`);
      assert.deepEqual(pagesForText(pages, 'First checklist item'), [2], `${title} should stay with the checklist`);
    }
  } finally {
    dom.window.close();
  }
});

test('pdfmake applies middle vertical alignment to checklist response cells', async () => {
  configurePdfMake();
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108.html'), 'utf8');
  const marker = '      async #buildPdfDefinition () {';
  assert.ok(source.includes(marker));
  const html = source.replace('<script type="module">', '<script>').replace(
    marker,
    '      buildPdfForTest () { return this.#buildPdfDefinition(); }\n' +
      '      checklistForTest (rows) { return this.#buildChecklistBlock(rows, "test"); }\n' +
      marker
  );
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    virtualConsole: new VirtualConsole(),
    beforeParse (window) {
      window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect () {} });
      window.fetch = async () => ({ ok: false });
      window.CSS = { escape: value => value };
    },
  });

  try {
    await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
    const form = dom.window.__checkFormInstance;
    const block = form.checklistForTest([{
      question: Array(8).fill('Question text wraps onto multiple lines to create a tall row.').join(' '),
      answer: 'Yes',
    }]);
    const definition = await form.buildPdfForTest();
    definition.content = [block];
    const pages = await getLaidOutPages(definition);
    const alignment = pages.flatMap(page => page.items).find(item => item.type === 'beginVerticalAlignment');
    assert.equal(alignment?.item.verticalAlignment, 'middle');
    assert.ok(alignment.item.viewHeight > alignment.item.nodeHeight);
  } finally {
    dom.window.close();
  }
});

test('signature images retain their proportions in PDF layouts', async () => {
    configurePdfMake();
    const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108.html'), 'utf8');
    const marker = '      async #buildPdfDefinition () {';
    assert.ok(source.includes(marker));
    const html = source.replace('<script type="module">', '<script>').replace(
      marker,
      '      buildPdfForTest () { return this.#buildPdfDefinition(); }\n' +
        '      signatureBlockForTest (...args) { return this.#buildSignatureBlock(...args); }\n' +
        '      tier1SectionForTest (data) { return this.#buildTier1Section(data); }\n' +
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
    const images = [
      { ratio: 3, url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAACCAIAAAD0PzoJAAAAEElEQVR4nGNQMnZBQwyYQgCG0gct7Tl6qAAAAABJRU5ErkJggg==' },
      { ratio: 1 / 3, url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAAGCAIAAABmRdhlAAAAEElEQVR4nGNQMnYBIgbCFACVLgctClvb8QAAAABJRU5ErkJggg==' },
      { ratio: 1, url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGNQMnaBIwbiOAD2tAmRwbWNgAAAAABJRU5ErkJggg==' },
    ];

    try {
      await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
      assert.deepEqual(errors, []);
      const form = dom.window.__checkFormInstance;
      for (const { ratio, url } of images) {
        for (const prefix of ['sc', 'ch', 'pr', 'ir', 'fT1']) {
          const definition = await form.buildPdfForTest();
          definition.content = [
            prefix === 'fT1'
              ? form.tier1SectionForTest({ tlSignature: url })
              : form.signatureBlockForTest('', '', url, 'Signer', prefix),
          ];
          const pages = await getLaidOutPages(definition);
          const renderedImages = pages.flatMap(page => page.items.filter(item => item.type === 'image'));
          assert.equal(renderedImages.length, 1, prefix);
          const image = renderedImages[0].item;
          const heightLimit = prefix === 'ir' ? 86 : 40;
          assert.ok(Math.abs(image._width / image._height - ratio) < 1e-6, `${prefix}: ${JSON.stringify(image)}`);
          assert.ok(image._width <= 120 && image._height <= heightLimit, prefix);
          const bytes = await pdfMake.createPdf(definition).getBuffer();
          assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), '%PDF-');
        }
      }
      assert.deepEqual(errors, []);
    } finally {
      dom.window.close();
    }
});
