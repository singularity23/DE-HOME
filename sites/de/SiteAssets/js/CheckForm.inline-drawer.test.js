const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const drawerScript = fs.readFileSync(path.join(__dirname, '..', 'fluent-check-form-drawer', 'dist', 'check-form-drawer.js'), 'utf8');
const formHtml = fs.readFileSync(path.join(__dirname, '..', 'html', 'CheckForm.Optimized261108_2.html'), 'utf8');

test('empty drawer opens and closes without changing its content', () => {
  const dom = new JSDOM(formHtml, { runScripts: 'outside-only' });
  try {
    const { window } = dom;
    window.eval(drawerScript);
    const trigger = window.document.querySelector('.section-navigation-trigger');
    const drawer = window.document.getElementById('section-navigation-drawer');
    assert.equal(drawer.hidden, true);
    assert.equal(drawer.children.length, 0);
    assert.equal(drawer.textContent.trim(), '');

    trigger.click();
    assert.equal(drawer.hidden, false);
    assert.equal(trigger.textContent, 'Hide drawer');
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(drawer.children.length, 0);

    drawer.append('Custom information');
    trigger.click();
    assert.equal(drawer.hidden, true);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    trigger.click();
    assert.equal(drawer.textContent.trim(), 'Custom information');
  } finally {
    dom.window.close();
  }
});

test('saved drawer markup retains custom content but removes the old section list', () => {
  const dom = new JSDOM(`<div id="section-navigation">
    <button class="section-navigation-trigger" aria-expanded="false">Show sections</button>
    <div id="section-navigation-drawer"><nav class="section-navigation-links">Old sections</nav>
      <p>Custom information</p>
    </div></div>`, { runScripts: 'outside-only' });
  try {
    dom.window.eval(drawerScript);
    const drawer = dom.window.document.getElementById('section-navigation-drawer');
    const trigger = dom.window.document.querySelector('button');
    assert.equal(drawer.textContent.trim(), 'Custom information');
    assert.equal(trigger.textContent, 'Hide drawer');
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  } finally {
    dom.window.close();
  }
});
