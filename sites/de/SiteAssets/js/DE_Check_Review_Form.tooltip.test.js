const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');

async function createForm () {
  const source = fs.readFileSync(path.join(__dirname, '..', 'html', 'DE_Check_Review_Form.html'), 'utf8');
  const marker = '      async #buildPdfDefinition () {';
  assert.ok(source.includes(marker));
  const html = source.replace('<script type="module">', '<script>').replace(
    marker,
    '      setSignatureForTest (prefix, dataUrl) { this.#sig.setSignature(prefix, dataUrl); }\n' + marker
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
      window.CSS = { escape: value => value };
      window.HTMLElement.prototype.showPopover = function () { this.dataset.popoverOpen = 'true'; };
      window.HTMLElement.prototype.hidePopover = function () { delete this.dataset.popoverOpen; };
      const matches = window.Element.prototype.matches;
      window.Element.prototype.matches = function (selector) {
        return selector === ':popover-open' ? this.dataset.popoverOpen === 'true' : matches.call(this, selector);
      };
    },
  });
  await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
  assert.deepEqual(errors, []);
  return dom;
}

const delay = () => new Promise(resolve => setTimeout(resolve, 200));

test('signature tooltip follows signature state without affecting other tooltips', async () => {
  const dom = await createForm();
  try {
    const { document, Event, CheckFormAPI } = dom.window;
    const form = CheckFormAPI.instance;
    const container = document.getElementById('scSigContainer');
    const tooltip = document.getElementById('scSigTooltip');
    const peerHead = document.getElementById('sec4-head');
    const peerTooltip = document.getElementById('prTooltip');
    const hover = element => element.dispatchEvent(new Event('mouseenter'));
    const leave = element => element.dispatchEvent(new Event('mouseleave'));
    const isOpen = element => element.matches(':popover-open');

    hover(container);
    await delay();
    assert.ok(isOpen(tooltip));
    form.setSignatureForTest('sc', 'data:image/png;base64,AA==');
    assert.ok(!isOpen(tooltip));
    hover(container);
    container.dispatchEvent(new Event('focus'));
    await delay();
    assert.ok(!isOpen(tooltip));

    const otherContainer = document.getElementById('chSigContainer');
    hover(otherContainer);
    await delay();
    assert.ok(isOpen(document.getElementById('chSigTooltip')));
    leave(otherContainer);
    await delay();

    hover(peerHead);
    await delay();
    assert.ok(isOpen(peerTooltip));
    leave(peerHead);
    await delay();

    form.setSignatureForTest('sc', '');
    hover(container);
    form.setSignatureForTest('sc', 'data:image/png;base64,AA==');
    await delay();
    assert.ok(!isOpen(tooltip), 'a pending show must not reopen a signed tooltip');

    form.clearSection('s1');
    assert.equal(container.querySelector('.has-signature'), null);
    hover(container);
    await delay();
    assert.ok(isOpen(tooltip));
  } finally {
    dom.window.close();
  }
});
