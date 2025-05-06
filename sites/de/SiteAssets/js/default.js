// Constants
const ICON_URL =
  'https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/img/favicon.ico'
const LOGO_URL = 'https://hw.bchydro.bc.ca/Documents/BC%20Hydro%204C%20logo.jpg'
const DOWNLOAD_URL_PREFIX =
  'https://hydroshare.bchydro.bc.ca/sites/de/_layouts/15/download.aspx?SourceUrl='
const PREFIX = '/sites/de/'

// Helper Functions
function qS (selector, scope = document) {
  return scope.querySelector(selector)
}

function qSA (selector, scope = document) {
  return scope.querySelectorAll(selector)
}

function setAttributes (el, attrs) {
  Object.keys(attrs).forEach(key => el.setAttribute(key, attrs[key]))
}

// Debounce (clearly documented)
function debounce (func, wait = 100) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Core Functions
function changeLayout () {
  qSA('td[valign="top"][width="70%"]').forEach(td => (td.style.width = '85%'))
  qSA('td[valign="top"][width="30%"]').forEach(td => (td.style.width = '15%'))

  const hds = qS('#s4-titlerow')
  if (hds) hds.style.minHeight = '45px'

  const icon = qS('#favicon')
  if (icon) icon.href = ICON_URL
}

function removeZerowidth () {
  qSA('.ms-rtestate-field br').forEach(br => br.remove())
}

function showPopup (msg) {
  const popup = qS('.popup')
  if (!popup) return

  const content = qS('.popup-content', popup)
  if (content) content.innerHTML = msg

  popup.classList.add('show')
  setTimeout(() => popup.classList.remove('show'), 4000)
}

function changeLogoTitle () {
  const logo = qS('#ctl00_onetidHeadbnnr2')
  if (logo) logo.src = LOGO_URL

  const title = qS('#DeltaPlaceHolderPageTitleInTitleArea')
  if (title) title.textContent = title.textContent.trim()

  const content = qS(
    '#ctl00_PlaceHolderMain_ctl01__ControlWrapper_RichHtmlField'
  )
  if (content?.firstChild) content.firstChild.remove()
}

function tagUpdate () {
  const futureDate = new Date()
  futureDate.setMonth(futureDate.getMonth() + 3)
  const updateDateString = futureDate.toLocaleDateString()

  qSA('new, update').forEach(tag => {
    const tagDate = tag.getAttribute('date')
    const currentDate = new Date()

    if (!tagDate) {
      setAttributes(tag, { date: updateDateString })
      tag.textContent = tag.tagName.toLowerCase()
    } else if (currentDate >= new Date(tagDate)) {
      tag.remove()
    } else {
      tag.textContent = tag.tagName.toLowerCase()
    }
  })
}

function handleLinks() {
  document.body.addEventListener('click', (event) => {
    const link = event.target.closest('div.box ul li a');
    
    if (!link) return;

    event.preventDefault();
    const linkUrl = link.href;

    if (linkUrl.startsWith('file:')) {
      const copiedText = decodeURI(linkUrl).replace(/\s/g, ' ');
      navigator.clipboard.writeText(copiedText).then(() => {
        const inHtml = `<div><strong>${copiedText}</strong></div><div>has been copied to clipboard.</div>`;
        showPopup(inHtml);
      }).catch((err) => {
        console.error('Failed to copy text to clipboard:', err);
      });
    } else if (isValidUrl(linkUrl)) {
      const link = `${DOWNLOAD_URL_PREFIX}${linkUrl}`;
      checkLinkHealth(link).then((isHealthy) => {
        if (isHealthy) {
          const fname = decodeURI(linkUrl).split('?')[0].split('/').pop();
          if (/^.*\.(pdf|docx)$/i.test(fname) && linkUrl.includes(PREFIX)) {
            window.open(link, '_blank');
          } else {
            window.open(linkUrl, '_blank');
          }
        } else {
          console.error(`Unhealthy or inaccessible URL: ${linkUrl}`);
          showPopup(`<div><strong>${linkUrl}</strong></div><div>is not accessible.</div>`);
        }
      });
    } else {
      console.error(`Invalid URL: ${linkUrl}`);
    }
  });
}

// Helper function to check if a link is healthy
function checkLinkHealth(url) {
  return fetch(url, { method: 'HEAD' })
    .then((response) => {
      console.log(response); // Log the response for debugging
      return response.ok; // Returns true if status is 200-299
    })
    .catch(() => false); // Returns false if the request fails
}

function isValidUrl (url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function scrollHandler () {
  const hand = qS('#s4-workspace')
  if (!hand) return

  hand.onscroll = debounce(() => {
    const totalHeight = Math.round(hand.scrollTop + hand.clientHeight) + 10
    const feedbackSection = qS('.right-section')

    if (window.outerWidth < 1440 && feedbackSection) {
      feedbackSection.style.bottom =
        totalHeight >= hand.scrollHeight ? '160px' : '10px'
      refresh()
    }
  })
}

function getCurrentYear () {
  const yearElement = qS('#year')
  if (yearElement) {
    yearElement.firstChild.textContent = new Date().getFullYear()
  }
}

function removeBreadcrumb () {
  ;['.ms-breadcrumb-top', 'td.ms-bottompagingline1'].forEach(selector => {
    const el = qS(selector)
    el && el.remove()
  })
}

function resizeWindow () {
  window.addEventListener(
    'resize',
    debounce(() => {
      const width = window.innerWidth || document.documentElement.clientWidth
      const contentBox = qS('#contentBox')
      if (contentBox) {
        contentBox.style.width = `${width}px`
        if (width < 800) {
          contentBox.style.marginLeft = '0'
        }
      }
    })
  )
}

function firstListener () {
  qS(
    '#Ribbon\\.EditingTools\\.CPEditTab\\.Markup\\.Html\\.Menu\\.Html\\.EditSource-Large'
  )?.addEventListener('click', secondListener)
}

function secondListener () {
  const editor = qS('#PropertyEditor')
  if (editor) editor.value = editor.value.replace(/(?<=\n\s)\s+/gm, '')
}

qS('#MSOZoneCell_WebPartWPQ6')?.addEventListener('click', () =>
  setTimeout(firstListener, 500)
)

// Initialization
function refresh () {
  changeLogoTitle()
  removeZerowidth()
  changeLayout()
  tagUpdate()
  handleLinks()
  scrollHandler()
  getCurrentYear()
  removeBreadcrumb()
  resizeWindow()
}

document.addEventListener('DOMContentLoaded', refresh)
