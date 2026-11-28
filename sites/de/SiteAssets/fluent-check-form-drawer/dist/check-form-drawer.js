// Adapted from UI Moments gallery/fluent-ui/feedback.jsx, InlineDrawerDemo.
// Copyright (c) 2026 guanmo-ai. MIT License; see ../LICENSE.
(function () {
  'use strict';

  const mount = document.getElementById('section-navigation');
  const trigger = mount?.querySelector('.section-navigation-trigger');
  const drawer = mount?.querySelector('#section-navigation-drawer');
  if (!trigger || !drawer) {
    console.error('Drawer controls were not found.');
    return;
  }

  // Remove the section list from snapshots saved with the previous drawer.
  drawer.querySelector('.section-navigation-links')?.remove();
  trigger.setAttribute('aria-expanded', String(!drawer.hidden));
  trigger.textContent = drawer.hidden ? 'Show drawer' : 'Hide drawer';

  trigger.addEventListener('click', () => {
    const open = drawer.hidden;
    drawer.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    trigger.textContent = open ? 'Hide drawer' : 'Show drawer';
  });
})();
