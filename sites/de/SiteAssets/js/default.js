// Constants
const ICON_URL = 'https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/img/favicon.ico';
const LOGO_URL = 'https://hw.bchydro.bc.ca/Documents/BC%20Hydro%204C%20logo.jpg';
const DOWNLOAD_URL_PREFIX = 'https://hydroshare.bchydro.bc.ca/sites/de/_layouts/download.aspx?SourceUrl=';
const PREFIX = '/sites/de/';
const SUFFIX = '?download=1';

// Helper Functions
const qS = (selector, scope = document) => scope.querySelector(selector);

const qSA = (selector, scope = document) => scope.querySelectorAll(selector);

const setAttributes = (el, attrs) => {
  Object.keys(attrs).forEach(key => el.setAttribute(key, attrs[key]));
};

// Set announcement
const setAnnouncement = () => {
  const fullmode = qS('body.ms-backgroundImage.ms-fullscreenmode');
  const focused = qS('body.ms-backgroundImage');
  if (!fullmode && focused) {
    focused.classList.add('ms-fullscreenmode');
  }
};

// Debounce function
const debounce = (func, wait = 100) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Core Functions
const changeLayout = () => {
  qSA('td[valign="top"][width="70%"]').forEach(td => (td.style.width = '85%'));
  qSA('td[valign="top"][width="30%"]').forEach(td => (td.style.width = '15%'));

  const hds = qS('#s4-titlerow');
  if (hds) hds.style.minHeight = '45px';

  const icon = qS('#favicon');
  if (icon) icon.href = ICON_URL;
};

const removeZerowidth = () => {
  qSA('.ms-rtestate-field br').forEach(br => br.remove());
};

const showPopup = msg => {
  const popup = qS('.popup');
  if (!popup) return;

  const content = qS('.popup-content', popup);
  if (content) content.innerHTML = msg;

  popup.classList.add('show');
  setTimeout(() => popup.classList.remove('show'), 4000);
};

const changeLogoTitle = () => {
  const logo = qS('#ctl00_onetidHeadbnnr2');
  if (logo) logo.src = LOGO_URL;

  const title = qS('#DeltaPlaceHolderPageTitleInTitleArea');
  if (title) title.textContent = title.textContent.trim();

  const content = qS('#ctl00_PlaceHolderMain_ctl01__ControlWrapper_RichHtmlField');
  if (content?.firstChild) content.firstChild.remove();
};

const tagUpdate = () => {
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 3);
  const updateDateString = futureDate.toLocaleDateString();

  qSA('new, update').forEach(tag => {
    const tagDate = tag.getAttribute('date');
    const currentDate = new Date();

    if (!tagDate) {
      setAttributes(tag, { date: updateDateString });
      tag.textContent = tag.tagName.toLowerCase();
    } else if (currentDate >= new Date(tagDate)) {
      tag.remove();
    } else {
      tag.textContent = tag.tagName.toLowerCase();
    }
  });
};

const handleLinks = () => {
  document.body.addEventListener('click', event => {
    const linkEl = event.target.closest('links dd .sub_link a') || event.target.closest('.links dd a');

    if (!linkEl) return;

    event.preventDefault();

    // Check if gtag is available before calling it
    if (typeof gtag === 'function') {
      gtag('event', 'link_click', {
        link_name: linkEl.innerText.trim(),
        link_url: linkEl.href,
      });
    }

    const linkUrl = linkEl.href;

    if (isValidUrl(linkUrl) && linkUrl) {
      if (linkUrl.startsWith('file:') || linkEl.classList.contains('_clipboard')) {
        const copiedText = decodeURI(linkUrl).replace(/\s/g, ' ');

        navigator.clipboard
          .writeText(copiedText)
          .then(() => {
            const inHtml = `<div><strong>${copiedText}</strong></div><div>has been copied to clipboard.</div>`;
            showPopup(inHtml);
          })
          .catch(err => {
            console.error('Failed to copy text to clipboard:', err);
          });
      } else if (linkEl.classList.contains('_form')) {
        if (linkUrl.includes(PREFIX)) {
          const originalUrl = decodeURI(linkUrl).split('?')[0];
          const downloadUrl = `${DOWNLOAD_URL_PREFIX}${originalUrl}${SUFFIX}`;

          checkLinkHealth(downloadUrl).then(isHealthy => {
            if (isHealthy) {
              window.open(downloadUrl, '_blank');
            } else {
              console.error(`Inaccessible download URL: ${linkUrl}`);
            }
          });
        } else {
          window.open(linkUrl, '_blank');
        }
      } else {
        window.open(linkUrl, '_blank');
      }
    } else {
      console.error(`Invalid URL: ${linkUrl}`);
    }
  });
};

// Helper function to check if a link is healthy
const checkLinkHealth = async url => {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok; // Returns true if status is 200-299
  } catch {
    return false;
  }
};

const isValidUrl = url => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const scrollHandler = () => {
  const hand = qS('#s4-workspace');
  if (!hand) return;

  hand.onscroll = debounce(() => {
    const totalHeight = Math.round(hand.scrollTop + hand.clientHeight) + 10;
    const feedbackSection = qS('.right-section');

    if (window.outerWidth < 1440 && feedbackSection) {
      feedbackSection.style.bottom = totalHeight >= hand.scrollHeight ? '160px' : '10px';
      refresh();
    }
  });
};

const getCurrentYear = () => {
  const yearElement = qS('#year');
  if (yearElement) {
    yearElement.firstChild.textContent = new Date().getFullYear();
  }
};

const removeBreadcrumb = () => {
  ['.ms-breadcrumb-top', 'td.ms-bottompagingline1'].forEach(selector => {
    const el = qS(selector);
    el && el.remove();
  });
};

const resizeWindow = () => {
  window.addEventListener(
    'resize',
    debounce(() => {
      const width = window.innerWidth || document.documentElement.clientWidth;
      const contentBox = qS('#contentBox');
      if (contentBox) {
        contentBox.style.width = `${width}px`;
        if (width < 800) {
          contentBox.style.marginLeft = '0';
        }
      }
    })
  );
};

const firstListener = () => {
  const ribbonElement = qS('#Ribbon\\.EditingTools\\.CPEditTab\\.Markup\\.Html\\.Menu\\.Html\\.EditSource-Large');
  if (ribbonElement) {
    ribbonElement.addEventListener('click', secondListener);
  }
};

const secondListener = () => {
  const editor = qS('#PropertyEditor');
  if (editor) {
    editor.value = editor.value.replace(/(?<=\n\s)\s+/gm, '');
  }
};

const setupWebPartListener = () => {
  const webPartElement = qS('#MSOZoneCell_WebPartWPQ6');
  if (webPartElement) {
    webPartElement.addEventListener('click', () => setTimeout(firstListener, 500));
  }
};

// Initialization
const refresh = () => {
  setAnnouncement();
  changeLogoTitle();
  removeZerowidth();
  changeLayout();
  tagUpdate();
  handleLinks();
  scrollHandler();
  getCurrentYear();
  removeBreadcrumb();
  resizeWindow();
  setupWebPartListener();
};

document.addEventListener('DOMContentLoaded', refresh);
