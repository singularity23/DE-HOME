const appendHeadContent = () => {
  const head = document.head;

  const tags = [
    '<meta http-equiv="X-UA-Compatible" content="IE=11">',
    '<meta http-equiv="X-UA-Compatible" content="IE=Edge">',
    '<meta name="viewport" content="width=device-width" initial-scale="1.0" maximum-scale="1.0" user-scalable="no">',
    '<meta http-equiv="content-type" content="text/html; charset=utf-8">',
    '<meta http-equiv="Expires" content="0">',
    '<meta http-equiv="Access-Control-Allow-orgin" content="true">',
    '<meta name="GENERATOR" content="Microsoft SharePoint">',
    '<meta name="Title" content="Distribution Engineering - Home">',
    '<meta name="Subject" content="Distribution Engineering - Home">',
    '<meta name="Description" content="All useful links for DE">',
    '<meta name="Keywords" content="Distribution; Engineering; Links; ">',
    '<meta name="Language" content="en-CA">',
    '<meta name="Abstract" content="Home Page">',
    '<meta name="Copyright" content="BC Hydro">',
    '<meta name="Designer" content="Kan Tang">',
    '<meta name="Distribution" content="IU">',
    '<meta name="Robots" content="All">',
    '<link rel="preload" href="/sites/de/SiteAssets/js/default2.js" as="script">',
    '<link rel="shortcut icon" href="/sites/de/SiteAssets/img/favicon.ico" type="image/vnd.microsoft.icon" id="favicon">',
    '<link rel="stylesheet" type="text/css" href="/sites/de/SiteAssets/css/default.css?v=1.1">',
    '<link rel="stylesheet" type="text/css" href="/sites/de/SiteAssets/css/default2.css?v=1.1">',
    '<script src="/sites/de/SiteAssets/js/default.js"></script>',
    '<script src="/sites/de/SiteAssets/js/default2.js" defer></script>',
    '<script src="/sites/de/SiteAssets/js/turndown.min.js"></script>',
    '<script src="/sites/de/SiteAssets/js/marked.min.js"></script>',
  ];

  tags.forEach(tagStr => {
    const temp = document.createElement('div');
    temp.innerHTML = tagStr.trim();
    const node = temp.firstChild;
    if (node) head.appendChild(node);
  });
};
