javascript: (function () {
  const script_1 = document.createElement('script')
  script_1.setAttribute(
    'src',
    'https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/js/ASPEN_SearchBar.js'
  )
  document.head.appendChild(script_1)
  const script_2 = document.createElement('script')
  script_2.type = 'text/javascript'
  script_2.src =
    'https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/js/ASPEN_Query.js'
  document.body.insertBefore(script_2, document.body.firstChild)
})()
