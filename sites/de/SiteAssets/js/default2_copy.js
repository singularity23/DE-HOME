const CONFIG = {
  folderUrl: '/sites/de/SiteAssets/link',
  apiEndpoint: 'https://hydroshare.bchydro.bc.ca/sites/de/_api/web',
  breakpoints: {
    desktop: 1440,
    laptop: 1024,
    tablet: 768,
    mobile: 480,
  },
};

let categories = [];

/**
 * Creates a DOM element with attributes
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes to set
 * @returns {HTMLElement} The created element
 */
const createElement = (tag, attrs = {}) => {
  const element = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  return element;
};

/**
 * Renders the categories to the DOM
 * @param {Array} categoriesToRender - Categories to display
 */
const renderCategories = categoriesToRender => {
  const columns = getColumns();
  try {
    const container = document.getElementById('categoriesContainer');
    if (!container || !Array.isArray(categoriesToRender)) {
      throw new Error('Invalid container or categories data');
    }

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    categoriesToRender.forEach((category, categoryIndex) => {
      const panel = createElement('div', { className: 'links panel' });
      panel.appendChild(
        createElement('div', {
          className: 'panel-heading',
          textContent: category.name,
        })
      );

      const body = createElement('div', { className: 'panel-body' });

      category.subheaders.forEach((subheader, subheaderIndex) => {
        const dl = createElement('dl', { className: 'grid-container' });
        let dt;
        if (subheader.title) {
          dt = createSubheaderTitle(subheader, categoryIndex, subheaderIndex);
          dl.appendChild(dt);
        }

        subheader.links.forEach((link, linkIndex) => {
          dl.appendChild(createLinkElement(link, categoryIndex, subheaderIndex, linkIndex));
        });

        body.appendChild(dl);
        if (dt) {
          adjustGridLayout(dl, dt, columns);
        }
      });

      panel.appendChild(body);
      fragment.appendChild(panel);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
  } catch (error) {
    console.error('Error rendering categories:', error);
  }
};

// Debounce function for resize events
const debounceFunc = (func, wait) => {
  let timeout;
  return function executedFunction (...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Optimized resize function
const resize = debounceFunc(() => {
  const containers = document.querySelectorAll('.grid-container');

  containers.forEach(container => {
    const firstItem = container.querySelector('.special');
    if (!firstItem) return;

    const columns = getColumns();
    adjustGridLayout(container, firstItem, columns);
  });
}, 0);

const getColumns = () => {
  const { clientWidth: documentWidth } = document.documentElement;

  let columns = 4; // Default columns

  if (documentWidth <= CONFIG.breakpoints.mobile) {
    columns = 1;
  } else if (documentWidth <= CONFIG.breakpoints.tablet) {
    columns = 1;
  } else if (documentWidth <= CONFIG.breakpoints.laptop) {
    columns = 2;
  } else if (documentWidth <= CONFIG.breakpoints.desktop) {
    columns = 3;
  }
  console.log(documentWidth);
  console.log('Columns:', columns);
  return columns;
};

const fetchData = async url => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    return null; // Return null if the fetch fails
  }
};
// Initialize the application
const initializeApp = async () => {
  try {
    // Load categories from external file
    const categoriesData = await fetchData('/sites/de/SiteAssets/js/categories.json');
    if (categoriesData) {
      categories = JSON.parse(categoriesData);
      initializeSearch();
      renderCategories(categories);
    } else {
      console.error('Failed to load categories data');
    }
    // Event listeners
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', resize);
  } catch (error) {
    console.error('Error initializing app:', error);
  }
};

/**
 * Creates a subheader title element
 * @param {Object} subheader - The subheader object
 * @param {number} categoryIndex - Index of the category
 * @param {number} subheaderIndex - Index of the subheader
 * @returns {HTMLElement} The created title element
 */
const createSubheaderTitle = (subheader, categoryIndex, subheaderIndex) => {
  const dt = createElement('dt', { className: 'special' });
  const dtLink = createElement('a', {
    className: 'nogo',
    textContent: subheader.title,
  });

  dt.appendChild(dtLink);

  // Set data attributes for tracking
  dt.dataset.categoryIndex = categoryIndex;
  dt.dataset.subheaderIndex = subheaderIndex;

  return dt;
};

/**
 * Creates a link element with sub-links if present
 * @param {Object} link - The link object
 * @param {number} categoryIndex - Index of the category
 * @param {number} subheaderIndex - Index of the subheader
 * @param {number} linkIndex - Index of the link
 * @returns {HTMLElement} The created link element
 */
const createLinkElement = (link, categoryIndex, subheaderIndex, linkIndex) => {
  const dd = createElement('dd', { className: 'item' });
  const linkEl = link.url
    ? createElement('a', {
        href: link.url,
        target: '_blank',
        className: link.class || '',
      })
    : createElement('a', { className: 'nogo' });
  // Add link content
  linkEl.innerHTML = `
    <span class="link-title">${link.name}</span>
    <span class="link-info">${link.info || ''}</span>
  `;

  // Set data attributes
  linkEl.dataset.categoryIndex = categoryIndex;
  linkEl.dataset.subheaderIndex = subheaderIndex;
  linkEl.dataset.linkIndex = linkIndex;

  // Add sub-links if present
  if (link.sub_links && link.sub_links.length > 0) {
    const sublinkContainer = createElement('span', { className: 'sub-link' });
    link.sub_links.forEach(subLink => {
      const sublinkEl = createElement('span');
      sublinkEl.innerHTML = subLink.class
        ? `
        <a href="${subLink.url}" target="_blank" class="${subLink.class}">${subLink.name}</a>
        <span>&nbsp;</span>
      `
        : `
        <a href="${subLink.url}" target="_blank">${subLink.name}</a>
        <span>&nbsp;</span>
      `;
      sublinkContainer.appendChild(sublinkEl);
    });
    linkEl.appendChild(sublinkContainer);
  }

  dd.appendChild(linkEl);
  return dd;
};

/**
 * Adjusts the grid layout based on container width
 * @param {HTMLElement} container - The grid container
 * @param {HTMLElement} firstItem - The first item in the grid
 * @param {number} columns - Number of columns to display
 */
const adjustGridLayout = (container, firstItem, columns) => {
  const items = container.querySelectorAll('.item');
  const total = items.length;

  // Calculate rows needed
  const rows = Math.ceil(total / columns) || 1;
  firstItem.style.gridRow = `span ${rows}`;
  // Set grid layout
  /*   firstItem.style.gridRow = `span ${Math.max(1, rows)}`;
  const height = rows * 80 + (rows - 1) * 10;
  firstItem.style.height = `${height}px`; */

  //console.log('Grid layout adjusted:', { rows, columns, total });
};

/**
 * Initializes the search functionality
 */
const initializeSearch = () => {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) {
    console.error('Search input element not found');
    return;
  }

  // Debounce the search to improve performance
  const debouncedSearch = debounceFunc(searchTerm => {
    if (!searchTerm) {
      renderCategories(categories);
      return;
    }

    const filteredCategories = filterCategories(searchTerm);
    renderCategories(filteredCategories);
  }, 300);

  searchInput.addEventListener('input', e => {
    const searchTerm = e.target.value.toLowerCase().trim();
    debouncedSearch(searchTerm);
  });
};

/**
 * Filters categories based on search term
 * @param {string} searchTerm - The search term
 * @returns {Array} Filtered categories
 */
const filterCategories = searchTerm => {
  if (!Array.isArray(categories)) {
    return [];
  }
  return categories
    .map(category => {
      const categoryMatches = category.name?.toLowerCase().includes(searchTerm);

      const filteredSubheaders = category.subheaders
        .map(subheader => {
          const subheaderMatches = subheader.title?.toLowerCase().includes(searchTerm);

          const filteredLinks = subheader.links.filter(
            link =>
              link.name?.toLowerCase().includes(searchTerm) ||
              link.info?.toLowerCase().includes(searchTerm) ||
              link.sub_links?.some(subLink => subLink.name?.toLowerCase().includes(searchTerm)) ||
              subheaderMatches ||
              categoryMatches
          );

          return filteredLinks.length > 0 || subheaderMatches ? { ...subheader, links: filteredLinks } : null;
        })
        .filter(Boolean);

      return filteredSubheaders.length > 0 ? { ...category, subheaders: filteredSubheaders } : null;
    })
    .filter(Boolean);
};

const showLoader = () => {
  const loader = document.getElementById('loader');
  const container = document.getElementById('DEcontainer');

  if (loader) {
    loader.classList.add('shown');
    loader.classList.remove('hidden');
  }
  if (container) {
    container.classList.add('hidden');
    container.classList.remove('shown');
  }
};

// Hide the loader
const hideLoader = () => {
  const loader = document.getElementById('loader');
  const container = document.getElementById('DEcontainer');

  if (loader) {
    loader.classList.add('hidden');
    loader.classList.remove('shown');
  }
  if (container) {
    container.classList.remove('hidden');
    container.classList.add('shown');
  }
};

const refreshApp = () => {
  showLoader();
  initializeApp();
  resize();
  setTimeout(() => {
    hideLoader();
  }, 1000); // Ensure loader is visible for at least 500ms
};

// Add event listener for DOM content loaded
document.addEventListener('DOMContentLoaded', refreshApp);

const insertGoogleAnalytics = () => {
  // Create the first script element (external gtag.js)
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = 'https://www.googletagmanager.com/gtag/js?id=G-MYQM69XE6F';

  // Create the second script element (inline configuration)
  const script2 = document.createElement('script');
  script2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-MYQM69XE6F');
  `;

  // Use event delegation for link clicks
  const script3 = document.createElement('script');
  script3.textContent = `
    document.getElementById('categoriesContainer').addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link) {
        gtag('event', 'link_click', {
          'link_name': link.innerText.trim(),
          'link_url': link.href
        });
        console.log("Gtag logged link click:", link.innerText.trim(), link.href);
      }
    });
  `;

  // Insert both into head
  document.head.appendChild(script1);
  document.head.appendChild(script2);
  document.body.appendChild(script3);
};

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', insertGoogleAnalytics);
} else {
  insertGoogleAnalytics();
}
