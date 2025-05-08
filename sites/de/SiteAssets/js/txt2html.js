;(async function fetchAndProcessData () {
  // Fetch directory listing
  const dirRes = await fetch('/sites/de/SiteAssets/source/')
  if (!dirRes.ok) {
    console.error('Directory fetch failed:', dirRes.status)
    return
  }
  let boxList = []
  const dirHtml = await dirRes.text()
  const doc = new DOMParser().parseFromString(dirHtml, 'text/html')
  const txtLinks = Array.from(doc.querySelectorAll('a'))
    .map(a => a.href)
    .filter(href => href.endsWith('.txt'))
  console.log(txtLinks)

  // Helper to add months to a YYYY-MM-DD string
  function addMonths (ymd, months) {
    const [y, m, d] = ymd.split('-').map(n => parseInt(n, 10))
    const dt = new Date(y, m - 1 + months, d)
    const yy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }

  // Parse & transform one line into markdown
  function transformRecord (line) {
    const parts = line.split(',').map(p => p.trim())

    const [idx, composite, type, dateOrig, link, logoText, logoSrc, logoLink] =
      parts

    const dateUsed = dateOrig ? addMonths(dateOrig, 3) : ''
    const [code, desc, trailing] = parseComposite(composite)
    console.log(composite)
    const indent = idx == 1 ? '*' : '  *'
    const openTag = type ? `<${type} date="${dateUsed}">` : ''
    const closeTag = type ? `</${type}>` : ''

    const md1 = desc ? `<abbr title="${desc}">${code}</abbr>` : `${code}`
    const md2 = trailing ? ` ${trailing}` : ''
    const md3 = dateOrig ? `${openTag}${closeTag}` : ''
    let md = link
      ? `${indent} [${md1}${md2}${md3}](${link})`
      : `${indent} ${md1}${md2}${md3}`
    console.log(md)
    if (logoText && logoSrc && logoLink) {
      md += `[![${logoText}](${logoSrc})](${logoLink})`
    }

    return md
  }

  // Helper to parse composite strings
  function parseComposite (composite) {
    const match = composite.match(/^([^(]+)\(([^)]+)\)(.*)$/)
    if (match) {
      return [match[1].trim(), match[2].trim(), match[3].trim()]
    }
    return [composite, '', '']
  }

  // Create and append a container
  function createContainer (name) {
    let container = document.getElementById(name)
    if (!container) {
      container = document.createElement('div')
      container.id = name
      container.className = 'output'
      container.style.whiteSpace = 'pre-wrap'
      container.style.fontFamily = 'monospace'
      const allOut = document.querySelectorAll('.output')
      if (allOut.length) allOut[allOut.length - 1].after(container)
      else document.body.appendChild(container)
    }
    return container
  }

  // Process each .txt file
  async function processFile (url) {
    let name = decodeURIComponent(
      url
        .split('/')
        .pop()
        .replace(/\.txt$/, '')
    )
    console.log(name)
    const container = createContainer(name)
    const idx = name.split('_')[0]
    console.log(idx)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        container.textContent = `Error loading ${name}.txt: ${res.status}`
        return
      }

      const raw = await res.text()
      const lines = raw.split(/\r?\n/).filter(l => l.trim())
      console.log(lines)
      if (lines.length < 2) {
        container.textContent = 'No data to transform'
        return
      }

      const [head, ...records] = lines
      console.log(head)
      const mdLines = [head, '']
      console.log(mdLines)
      records.forEach(ln => mdLines.push(transformRecord(ln)))
      console.log(mdLines)

      const md = mdLines.join('\n')
      console.log(md)
      let data = validateUrls(md)
      dataInfo = marked.parse(data)
      console.log(dataInfo)

      renderHTML(name, dataInfo, idx)
    } catch (error) {
      console.error(`Error processing file ${url}:`, error)
    }
  }

  const convertToFileUrl = path =>
    `file:///${encodeURI(path.replace(/\\/g, '/'))}`

  const validateUrls = content => {
    const urlRegex = /(?<=\]\()(.+)(?=\s\"|\))/gm
    const urls = content.match(urlRegex)

    urls?.forEach(url => {
      if (url.match(/[A-Za-z]:\\/)) {
        content = content.replace(url, convertToFileUrl(url))
        console.log(convertToFileUrl(url))
      }
    })

    return content
  }

  // Render HTML and attach event listeners
  function renderHTML (name, dataInfo, idx) {
    const box = document.createElement('div')
    box.classList.add('box')
    box.innerHTML = dataInfo

    const tempBox = (boxList[idx - 1] = document.createElement('div'))
    console.log(boxList)
    const dtag = document.createElement('div')
    const ptag = box.querySelector('p')
    dtag.classList.add('box-head')
    dtag.innerText = ptag.innerText
    box.prepend(dtag)
    ptag.remove()
    console.log(box)

    tempBox.innerHTML = `<!-- Start - Section: '${name}' -->\n${box.outerHTML}\n<!-- End - Section: '${name}' -->\n`

    const htmlCode = document.getElementById('html-code')
    const htmlRender = document.getElementById('html-render')

    console.log(boxList.map(box => box.innerHTML).join(''))
    htmlCode.value = boxList.map(box => box.innerHTML).join('')
    console.log(htmlCode.value)
    if (boxList.length == txtLinks.length) {
      htmlCode.value = `<section>${htmlCode.value}</section>`
    }
    if (htmlCode && htmlRender) {
      htmlRender.innerHTML = htmlCode.value
      tagUpdate()

      const copyHTML = document.getElementById('copyHTML')
      if (copyHTML) {
        copyHTML.addEventListener('click', e => {
          e.preventDefault()
          navigator.clipboard.writeText(htmlCode.value).then(() => {
            alert('HTML code copied to clipboard')
          })
        })
      }
    }
  }

  // Process all files in parallel
  await Promise.all(txtLinks.map(processFile))
})()

const loadDataButton = document.getElementById('loadData')

loadDataButton.addEventListener('click', evt => {
  evt.preventDefault()
  fetchAndProcessData()
})
