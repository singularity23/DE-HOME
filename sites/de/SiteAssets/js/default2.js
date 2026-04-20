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

// State management using modern ES6+ features
const state = {
  categories: [],
  searchCache: new Map(),
  isInitialized: false,
};

/*
 * Creates a DOM element with attributes using modern ES6+ patterns
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes to set
 * @returns {HTMLElement} The created element
 */
const createElement = (tag, attrs = {}) => {
  const element = document.createElement(tag);

  // Use modern object destructuring and optional chaining
  Object.entries(attrs).forEach(([key, value]) => {
    switch (key) {
      case 'className':
        element.className = value;
        break;
      case 'textContent':
        element.textContent = value;
        break;
      case 'innerHTML':
        element.innerHTML = value;
        break;
      default:
        element.setAttribute(key, value);
    }
  });

  return element;
};

/*
 * Fetches and processes files from the server
 * @param {string} fileUrl - The API endpoint URL
 * @returns {Promise<Array>} The processed file data
 */
const getFile = async fileUrl => {
  try {
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json;odata=verbose',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const txtFiles = data.d.results.filter(file => file.Name.endsWith('.txt'));

    if (txtFiles.length === 1) {
      return await readFile(txtFiles[0]);
    }

    throw new Error('No valid text file found');
  } catch (error) {
    console.error('Error fetching file:', error);
    return [];
  }
};

/*
 * Reads and processes a text file
 * @param {Object} txtFile - The text file object
 * @returns {Promise<Array>} The processed categories
 */
const readFile = async txtFile => {
  try {
    const fileResponse = await fetch(txtFile.ServerRelativeUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/plain',
      },
    });

    if (!fileResponse.ok) {
      throw new Error(`HTTP error! status: ${fileResponse.status}`);
    }

    return await fileResponse.text();
  } catch (error) {
    console.error('Error reading file:', error);
    return [];
  }
};

/*
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

    // Early return if no categories to render
    if (categoriesToRender.length === 0) {
      container.innerHTML = `<div class="links panel">
      <div class="panel-heading"> </div>
      <div class="panel-body">
      <dl class="grid-container">
      <dt class="special" style="grid-area: span 1 / span 4;">
      <a class="nogo">
        <span class="link-title">Search found nothing! </span><span class="link-info"> </span>
      </a>
      </dt>
      <dd class="item">
      <a href=" " target="_blank" class="" data-category-index="0" data-subheader-index="0" data-link-index="1">
        <span class="link-title"> </span><span class="link-info"> </span>
      </a>
      </dd>
      </dl>
      </div>
      </div>`;
      return;
    }

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    // Pre-calculate all elements to minimize DOM operations
    const panels = categoriesToRender.map((category, categoryIndex) => {
      const panel = createElement('div', { className: 'links panel' });
      panel.appendChild(
        createElement('div', {
          className: 'panel-heading',
          textContent: category.name,
        })
      );

      const body = createElement('div', { className: 'panel-body' });

      const subheaders = category.subheaders.map((subheader, subheaderIndex) => {
        const dl = createElement('dl', { className: 'grid-container' });
        let dt;
        if (subheader.title) {
          dt = createSubheaderTitle(subheader, categoryIndex, subheaderIndex);
          dl.appendChild(dt);
        }

        const links = subheader.links.map((link, linkIndex) =>
          createLinkElement(link, categoryIndex, subheaderIndex, linkIndex)
        );

        links.forEach(linkEl => dl.appendChild(linkEl));

        body.appendChild(dl);
        if (dt) {
          adjustGridLayout(dl, dt, columns);
        }

        return dl;
      });

      subheaders.forEach(subheaderEl => body.appendChild(subheaderEl));
      panel.appendChild(body);
      return panel;
    });

    // Append all panels at once
    panels.forEach(panel => fragment.appendChild(panel));

    // Single DOM update
    container.innerHTML = '';
    container.appendChild(fragment);
  } catch (error) {
    console.error('Error rendering categories:', error);
  }
};

// Debounce function for resize events
const debounceFunc = (func, wait) => {
  // Use closure to maintain state without function properties
  let timeoutId = null;
  let lastCallTime = 0;

  return (...args) => {
    const currentTime = Date.now();
    const timeSinceLastCall = currentTime - lastCallTime;

    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (timeSinceLastCall >= wait) {
      // Execute immediately if enough time has passed
      lastCallTime = currentTime;
      func.apply(this, args);
    } else {
      // Set timeout for later execution
      lastCallTime = currentTime;
      timeoutId = setTimeout(() => {
        timeoutId = null;
        lastCallTime = Date.now();
        func.apply(this, args);
      }, wait - timeSinceLastCall);
    }
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
}, 100);

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
  return columns;
};

// Initialize the application
// Application module using modern ES6+ patterns with TypeScript-style annotations
const App = {
  /*
   * Initialize the application with modern async/await patterns
   * @returns {Promise<void>}
   */
  async init () {
    try {
      // Load categories from external file
      const endpoint = `${CONFIG.apiEndpoint}/GetFolderByServerRelativeUrl('${CONFIG.folderUrl}')/Files`;
      const categoriesData = await getFile(endpoint);

      if (categoriesData) {
        state.categories = JSON.parse(categoriesData);
        this.initializeSearch();
        this.renderCategories(state.categories);
        state.isInitialized = true;
      } else {
        console.error('Failed to load categories data');
      }

      // Set up event listeners
      this.setupEventListeners();

      // Log successful initialization
      console.log('Application initialized successfully');

      // #region agent log
      // Check s4-bodyContainer layout issue
      const bodyContainer = document.getElementById('s4-bodyContainer');
      let bodyContainerData = {};
      if (bodyContainer) {
        const computedStyle = getComputedStyle(bodyContainer);
        bodyContainerData = {
          height: computedStyle.height,
          overflowY: computedStyle.overflowY,
          offsetHeight: bodyContainer.offsetHeight,
          scrollHeight: bodyContainer.scrollHeight,
          viewportHeight: window.innerHeight,
          isVisible: bodyContainer.offsetHeight > 0,
          actualHeightVsViewport: `${bodyContainer.offsetHeight}px vs ${window.innerHeight}px`,
        };
      } else {
        bodyContainerData = { error: 's4-bodyContainer element not found' };
      }

      fetch('http://127.0.0.1:7904/ingest/c0ba5003-5be6-4723-b532-ae5185df8f69', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd493a0' },
        body: JSON.stringify({
          sessionId: 'd493a0',
          location: 'default2.js:280',
          message: 's4-bodyContainer Layout Issue Check',
          data: { bodyContainer: bodyContainerData },
          timestamp: Date.now(),
          hypothesisId: 'F',
        }),
      }).catch(() => { });
      // #endregion
    } catch (error) {
      console.error('Error initializing app:', error);
      this.handleInitializationError(error);
    }
  },

  /*
   * Set up all event listeners
   */
  setupEventListeners () {
    // Debounced resize listener
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', resize, { passive: true });

    // DOM content loaded listener
    document.addEventListener('DOMContentLoaded', () => {
      if (!state.isInitialized) {
        this.init();
      }
    });

    // #region agent log
    // Add a delayed check for page layout after DOM loads
    setTimeout(() => {
      const contentBox = document.getElementById('contentBox');
      const sideNavBox = document.getElementById('sideNavBox');
      const categoriesContainer = document.getElementById('categoriesContainer');

      let layoutData = {
        contentBoxExists: !!contentBox,
        sideNavBoxExists: !!sideNavBox,
        categoriesExists: !!categoriesContainer,
      };

      if (contentBox) {
        const style = getComputedStyle(contentBox);
        layoutData.contentBox = {
          height: style.height,
          marginLeft: style.marginLeft,
          maxWidth: style.maxWidth,
          offsetHeight: contentBox.offsetHeight,
        };
      }

      fetch('http://127.0.0.1:7904/ingest/c0ba5003-5be6-4723-b532-ae5185df8f69', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd493a0' },
        body: JSON.stringify({
          sessionId: 'd493a0',
          location: 'default2.js:315',
          message: 'Page Layout Check After DOM Load',
          data: layoutData,
          timestamp: Date.now(),
          hypothesisId: 'F',
        }),
      }).catch(() => { });
    }, 1000);
    // #endregion
  },

  /*
   * Initialize search functionality
   */
  initializeSearch () {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
      console.error('Search input element not found');
      return;
    }

    // Debounce the search to improve performance
    const debouncedSearch = debounceFunc(searchTerms => {
      if (!searchTerms || searchTerms.length === 0) {
        this.renderCategories(state.categories);
        return;
      }

      const filteredCategories = filterCategories(searchTerms);
      this.renderCategories(filteredCategories);
    }, 300);

    searchInput.addEventListener('input', e => {
      const inputValue = e.target.value.toLowerCase();
      const searchTerms = getSearchTerms(inputValue);
      debouncedSearch(searchTerms);
    });
  },

  /*
   * Render categories with error handling
   * @param {Array} categoriesToRender - Categories to display
   */
  renderCategories (categoriesToRender) {
    try {
      renderCategories(categoriesToRender);
    } catch (error) {
      console.error('Error rendering categories:', error);
      this.handleRenderingError(error);
    }
  },

  /*
   * Handle initialization errors
   * @param {Error} error - The error object
   */
  handleInitializationError (error) {
    // Display user-friendly error message
    const container = document.getElementById('categoriesContainer');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <h3>Application Error</h3>
          <p>Unable to load application data. Please try refreshing the page.</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  },

  /*
   * Handle rendering errors
   * @param {Error} error - The error object
   */
  handleRenderingError (error) {
    // Fallback to empty state
    const container = document.getElementById('categoriesContainer');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <h3>Rendering Error</h3>
          <p>Unable to display categories. Please try refreshing the page.</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  },
};

/*
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
  dt.style.gridRow = 'span 1';

  return dt;
};

/*
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

/*
 * Adjusts the grid layout based on container width
 * @param {HTMLElement} container - The grid container
 * @param {HTMLElement} firstItem - The first item in the grid
 * @param {number} columns - Number of columns to display
 */
const adjustGridLayout = (container, firstItem, columns) => {
  const items = container.querySelectorAll('.item');
  const total = items.length;

  // Set grid layout
  const rows = Math.ceil(total / columns) || 1;
  firstItem.style.gridRow = `span ${rows}`;
};

/*
 * Extracts search terms from input value with proper fallback logic
 * @param {string} inputValue - The raw input value
 * @returns {Array<string>} Array of search terms
 */
const getSearchTerms = inputValue => {
  if (!inputValue || typeof inputValue !== 'string') {
    return [];
  }
  // First try splitting by commas (for comma-separated search terms)
  const separated = inputValue.includes(',')
    ? inputValue
      .split(',')
      .map(term => term.trim())
      .filter(term => term.length > 0)
    : inputValue
      .split(/\s+/)
      .map(term => term.trim())
      .filter(term => term.length > 0);

  if (separated.length > 1) {
    return separated;
  }

  if (inputValue.includes(',')) {
    return [inputValue.replace(/,/g, '').trim()];
  } // Final fallback: return the single input value if it's not empty
  return inputValue.trim().length > 0 ? [inputValue.trim()] : [];
};

/*
 * Initializes the search functionality
 */
const initializeSearch = () => {
  // #region agent log
  fetch('http://127.0.0.1:7904/ingest/c0ba5003-5be6-4723-b532-ae5185df8f69', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd493a0' },
    body: JSON.stringify({
      sessionId: 'd493a0',
      location: 'default2.js:504',
      message: 'initializeSearch function called',
      data: {},
      timestamp: Date.now(),
      hypothesisId: 'B,C',
    }),
  }).catch(() => { });
  // #endregion

  const searchInput = document.getElementById('searchInput');
  if (!searchInput) {
    console.error('Search input element not found');
    return;
  }

  // Debounce the search to improve performance
  const debouncedSearch = debounceFunc(searchTerms => {
    if (!searchTerms || searchTerms.length === 0) {
      renderCategories(state.categories);
      return;
    }

    const filteredCategories = filterCategories(searchTerms);
    renderCategories(filteredCategories);
  }, 300);

  searchInput.addEventListener('input', e => {
    const inputValue = e.target.value.toLowerCase();
    const searchTerms = getSearchTerms(inputValue);
    debouncedSearch(searchTerms);
  });
};

/*
 * Filters categories based on a single search term using modern functional programming patterns
 * @param {Array} categoriesToFilter - Categories to filter
 * @param {string} searchTerm - The search term
 * @returns {Array} Filtered categories
 */
const filterCategoriesByTerm = (categoriesToFilter, searchTerm) => {
  // Input validation with early returns
  if (!Array.isArray(categoriesToFilter) || !searchTerm?.trim()) {
    return [];
  }

  // Pre-compile search term to lowercase for performance
  const lowerSearchTerm = searchTerm.toLowerCase().trim();

  // Early termination for empty results
  if (categoriesToFilter.length === 0) {
    return [];
  }

  // Use functional programming with modern array methods
  return categoriesToFilter
    .map(category => {
      // Use optional chaining and nullish coalescing for safer property access
      const categoryMatches = category?.name?.toLowerCase().includes(lowerSearchTerm) ?? false;

      const filteredSubheaders =
        category.subheaders
          ?.map(subheader => {
            const subheaderMatches = subheader?.title?.toLowerCase().includes(lowerSearchTerm) ?? false;

            // Early return pattern for performance
            if (categoryMatches || subheaderMatches) {
              return { ...subheader, links: subheader.links };
            }

            // Use functional composition for link filtering
            const filteredLinks = subheader.links.filter(link => {
              // Use optional chaining for safer property access
              const nameMatch = link?.name?.toLowerCase().includes(lowerSearchTerm) ?? false;
              const infoMatch = link?.info?.toLowerCase().includes(lowerSearchTerm) ?? false;

              // Check sub-links with functional approach
              const subLinkMatch =
                link?.sub_links?.some(subLink => subLink?.name?.toLowerCase().includes(lowerSearchTerm) ?? false) ??
                false;

              return nameMatch || infoMatch || subLinkMatch;
            });

            return filteredLinks.length > 0 || subheaderMatches ? { ...subheader, links: filteredLinks } : null;
          })
          .filter(Boolean) ?? [];

      return filteredSubheaders.length > 0 ? { ...category, subheaders: filteredSubheaders } : null;
    })
    .filter(Boolean);
};

/*
 * Filters categories based on multiple search terms with modern caching and performance optimizations
 * @param {Array<string>} searchTerms - Array of search terms
 * @returns {Array} Filtered categories
 */
const filterCategories = searchTerms => {
  // Input validation with modern optional chaining
  if (!Array.isArray(searchTerms) || searchTerms.length === 0) {
    return state.categories;
  }

  // Create cache key from sorted search terms for consistent caching
  const cacheKey = searchTerms.sort().join('|');

  // Check cache first using modern Map methods
  if (state.searchCache.has(cacheKey)) {
    return state.searchCache.get(cacheKey);
  }

  // Use functional programming approach for filtering
  const filtered = searchTerms.reduce((acc, term) => {
    // Early termination if any term produces empty results
    if (acc.length === 0) {
      return [];
    }

    return filterCategoriesByTerm(acc, term);
  }, state.categories);

  // Cache management with modern Map methods
  if (state.searchCache.size >= 50) {
    // Use iterator protocol for cache cleanup
    const firstKey = state.searchCache.keys().next().value;
    state.searchCache.delete(firstKey);
  }

  state.searchCache.set(cacheKey, filtered);

  return filtered;
};
// Show the loader
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
  ModuleLoader.init();
  setTimeout(() => {
    hideLoader();
  }, 1000); // Ensure loader is visible for at least 500ms
};

// Modern module initialization with proper error handling
const ModuleLoader = {
  /*
   * Initialize all application modules
   */
  async init () {
    try {
      // Initialize the main application
      await App.init();

      // Initialize analytics after app is ready
      this.initializeAnalytics();

      console.log('All modules initialized successfully');
    } catch (error) {
      console.error('Module initialization failed:', error);
      this.handleModuleError(error);
    }
  },

  /*
   * Initialize Google Analytics with modern patterns
   */
  initializeAnalytics () {
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

    // Insert scripts into head using modern DOM manipulation
    const head = document.head || document.getElementsByTagName('head')[0];
    [script1, script2].forEach(script => head.appendChild(script));
  },

  /*
   * Handle module initialization errors
   * @param {Error} error - The error object
   */
  handleModuleError (error) {
    // Display user-friendly error message
    const container = document.getElementById('categoriesContainer');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <h3>Module Loading Error</h3>
          <p>The application failed to initialize properly.</p>
          <p>Error: ${error.message}</p>
          <button onclick="location.reload()">Refresh Page</button>
        </div>
      `;
    }
  },
};

// Modern DOM content loaded handling with async/await
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => refreshApp());
} else {
  refreshApp();
}
