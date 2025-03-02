javascript: (function () {
  const script_1 = document.createElement('script')
  script_1.type = 'text/javascript'
  script_1.src =
    'https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/js/ASPEN_SearchBar.js'
  document.body.insertBefore(script_1, document.body.firstChild)
  const script_2 = document.createElement('script')
  script_2.type = 'text/javascript'
  script_2.src =
    'https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/js/ASPEN_Query.js'
  document.body.insertBefore(script_2, document.body.firstChild)
})()
