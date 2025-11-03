const folderUrl = '/sites/de/SiteAssets/link';
const endpoint = `https://hydroshare.bchydro.bc.ca/sites/de/_api/web/GetFolderByServerRelativeUrl('${folderUrl}')/Files`;
let categories = [];

const getFile = async fileUrl => {
  const response = await fetch(fileUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json;odata=verbose',
    },
  });
  const data = await response.json();
  const txtFiles = data.d.results.filter(file => file.Name.endsWith('.txt'));
  if (txtFiles.length == 1) {
    const results = await readFile(txtFiles[0]);
    return results;
    console.log(results);
  }
};

const readFile = async txtFile => {
  const fileResponse = await fetch(txtFile.ServerRelativeUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/plain',
    },
  });
  const content = await fileResponse.text();

  categories = eval(content);
  renderCategories(categories);
};

function renderCategories (categoriesToRender) {
  try {
    // Get container with null check
    const container = document.getElementById('categoriesContainer');

    // Validate container exists
    if (!container) {
      console.error('Categories container element not found');
      return;
    }

    // Validate input
    if (!Array.isArray(categoriesToRender)) {
      console.error('Invalid categories data:', categoriesToRender);
      return;
    }

    // Clear container safely
    container.innerHTML = '';

    categoriesToRender.forEach((category, categoryIndex) => {
      const panel = document.createElement('div');
      panel.className = 'links panel';

      const heading = document.createElement('div');
      heading.className = 'panel-heading';
      heading.textContent = category.name;
      panel.appendChild(heading);

      const body = document.createElement('div');
      body.className = 'panel-body';

      category.subheaders.forEach((subheader, subheaderIndex) => {
        const dl = document.createElement('dl');
        dl.className = 'grid-container';
        if (subheader.title) {
          const dt = document.createElement('dt');
          dt.className = 'special';
          const dtLink = document.createElement('a');
          dtLink.href = '#nogo';
          dtLink.target = '_blank';
          dtLink.textContent = subheader.title;
          dt.appendChild(dtLink);
          dl.appendChild(dt);
          const len = subheader.links.length;
          rows = Math.ceil(len / 4);
          dt.style.gridRow = `span ${rows > 1 ? rows : 1}`;
        }

        subheader.links.forEach((link, linkIndex) => {
          const dd = document.createElement('dd');
          dd.className = 'item';
          const linkEl = document.createElement('a');
          linkEl.href = link.url;
          linkEl.target = '_blank';
          linkEl.innerHTML = `<span class="link-title">${link.name}</span><span class="link-info">${link.info}</span>`;

          linkEl.dataset.categoryIndex = categoryIndex;
          linkEl.dataset.subheaderIndex = subheaderIndex;
          linkEl.dataset.linkIndex = linkIndex;

          dd.appendChild(linkEl);
          dl.appendChild(dd);

          if (link.sub_links) {
            const sublinkContainer = document.createElement('span');
            sublinkContainer.className = 'sub-link';
            link.sub_links.forEach(sub_link => {
              const sublinkEl = document.createElement('span');
              sublinkEl.innerHTML = `<b>|</b> <a href="${sub_link.url}" target="_blank">${sub_link.name}</a><span>&nbsp;</span>
          `;
              sublinkContainer.appendChild(sublinkEl);
            });
            linkEl.appendChild(sublinkContainer);
          }
        });
        body.appendChild(dl);
      });

      panel.appendChild(body);
      container.appendChild(panel);
    });
  } catch (error) {
    console.error('Error rendering categories:', error);
  }
}

// Ensure DOM is loaded before first render
document.addEventListener('DOMContentLoaded', () => {
  try {
    getFile(endpoint);
  } catch (error) {
    console.error('Initial render failed:', error);
  }
});

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Get search input element
    const searchInput = document.getElementById('searchInput');

    // Validate search input exists
    if (!searchInput) {
      console.error('Search input element not found');
      return;
    }

    // Add event listener with error handling
    searchInput.addEventListener('input', function (e) {
      try {
        // Validate event and target
        if (!e || !e.target) {
          console.error('Invalid event object');
          return;
        }

        const searchTerm = e.target.value.toLowerCase().trim();
        //console.log('Search term:', searchTerm);

        // If search is empty, show all categories
        if (!searchTerm) {
          return renderCategories(categories);
        }

        // Validate categories exists
        if (!Array.isArray(categories)) {
          console.error('Categories not properly initialized');
          return;
        }

        // Filter categories based on search term
        const filteredCategories = categories
          .map(category => {
            if (!category || typeof category !== 'object') {
              return null;
            }

            const categoryMatches = category.name?.toLowerCase().includes(searchTerm) || false;

            const filteredSubheaders = (category.subheaders || [])
              .map(subheader => {
                if (!subheader || typeof subheader !== 'object') {
                  return null;
                }

                const subheaderMatches = subheader.title?.toLowerCase().includes(searchTerm) || false;

                const filteredLinks = (subheader.links || []).filter(
                  link => link?.name?.toLowerCase().includes(searchTerm) || subheaderMatches || categoryMatches
                );

                return {
                  ...subheader,
                  links: filteredLinks,
                };
              })
              .filter(Boolean) // Remove null entries
              .filter(
                subheader =>
                  subheader.links.length > 0 || subheader.title?.toLowerCase().includes(searchTerm) || categoryMatches
              );

            return {
              ...category,
              subheaders: filteredSubheaders,
            };
          })
          .filter(Boolean) // Remove null entries
          .filter(category => category.subheaders.length > 0);

        renderCategories(filteredCategories);
      } catch (searchError) {
        console.error('Error during search:', searchError);
        // Fallback to showing all categories
        renderCategories(categories);
      }
    });
  } catch (initError) {
    console.error('Error initializing search:', initError);
  }
});

function resize () {
  const containers = document.querySelectorAll('.grid-container');

  containers.forEach(container => {
    const firstItem = container.querySelector('.special');
    if (firstItem) {
      containerWidth = container.clientWidth;
      itemWidth = firstItem.clientWidth;
      let actualTotal = Math.floor(containerWidth / itemWidth) - 1;

      if (window.innerWidth > 1440) {
        actualTotal = 4;
      } else if (window.innerWidth <= 1440 && window.innerWidth > 1024) {
        actualTotal = 3;
      } else if (window.innerWidth <= 1024 && window.innerWidth > 768) {
        actualTotal = 2;
      } else if (window.innerWidth <= 768 && window.innerWidth > 480) {
        actualTotal = 1;
      } else {
        actualTotal = Math.floor(containerWidth / itemWidth) - 1;
      }

      function adjustFirstItemSpan () {
        const items = container.querySelectorAll('.item');
        const total = items.length;
        // Number of rows = ceil(total / 5)
        let rows = Math.ceil(total / actualTotal);

        // First item spans N rows if >1
        firstItem.style.gridRow = `span ${rows > 1 ? rows : 1}`;

        // Set first item height dynamically (optional)
        const singleHeight = 80; // matches CSS
        firstItem.style.height = `${rows * singleHeight + 20}px`; // include gap
      }

      // Run initially
      adjustFirstItemSpan();

      // Optional: auto-adjust when items are added or removed
      const observer = new MutationObserver(adjustFirstItemSpan);
      observer.observe(container, { childList: true });
    }
  });
}

document.addEventListener('DOMContentLoaded', resize);
window.addEventListener('resize', resize);
window.addEventListener('scroll', resize);
