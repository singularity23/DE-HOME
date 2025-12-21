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

/**
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

    const content = await fileResponse.text();
    categories = JSON.parse(content); // Using JSON.parse instead of eval for security
    renderCategories(categories);
    return categories;
  } catch (error) {
    console.error('Error reading file:', error);
    return [];
  }
};
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
  console.log('Resize event detected');
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
const initializeApp = () => {
  try {
    const endpoint = `${CONFIG.apiEndpoint}/GetFolderByServerRelativeUrl('${CONFIG.folderUrl}')/Files`;
    getFile(endpoint);
    initializeSearch();
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
  dt.style.gridRow = 'span 1';

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
      sublinkEl.innerHTML = ` 
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

  // Set grid layout
  const rows = Math.ceil(total / columns) || 1;
  firstItem.style.gridRow = `span ${rows}`;
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
// Show the loader
const showLoader = () => {
  document.getElementById('loader').style.display = 'flex';
  console.log('Loader displayed');
  document.getElementById('DEcontainer').classList.add('hidden');
};

// Hide the loader
const hideLoader = () => {
  document.getElementById('loader').style.display = 'none';
  document.getElementById('loader').classList.add('hidden');
  console.log('Loader hidden');
  document.getElementById('DEcontainer').classList.remove('hidden');
};

const refreshApp = () => {
  showLoader();
  initializeApp();
  resize();
  setTimeout(() => {
    hideLoader();
  }, 2000);
};
// Add event listener for DOM content loaded
document.addEventListener('DOMContentLoaded', refreshApp);
