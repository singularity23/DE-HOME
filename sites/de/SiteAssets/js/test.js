window.onload = () => {
  const state = {
    fileList: [],
    boxList: [],
  }

  const input = document.querySelector('#file-container input')
  const preview = document.querySelector('.preview')
  const loadDataButton = document.getElementById('loadData')
  const updateButton = document.getElementById('updateHTML')
  const copyHTML = document.getElementById('copyHTML')
  const htmlCode = document.getElementById('html-code')
  const htmlRender = document.getElementById('html-render')

  const updateDisplay = () => {
    preview.innerHTML = '' // Clear preview
    const { files } = input

    if (!files || files.length === 0) {
      preview.innerHTML = '<p>No files currently selected for upload</p>'
    } else {
      const fileNames = Array.from(files)
        .map(file => file.name)
        .sort()
      state.fileList = Array.from(files).sort()
      preview.innerHTML = `<div><span>${fileNames.join(', ')}</span></div>`
    }
  }

  input.style.opacity = 0
  input.style.width = 0
  input.addEventListener('change', updateDisplay)

  const addMonths = (ymd, months) => {
    const [y, m, d] = ymd.split('-').map(Number)
    const dt = new Date(y, m - 1 + months, d)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(dt.getDate()).padStart(2, '0')}`
  }

  const validateUrls = content => {
    const urlRegex = /(?<=\]\()(.+?)(?=\s\"|\))/gm
    return content.replace(urlRegex, url =>
      url.match(/[A-Za-z]:\\/) ? convertToFileUrl(url) : url
    )
  }

  const convertToFileUrl = path =>
    `file:///${encodeURI(path.replace(/\\/g, '/'))}`

  const handleFile = async (file, index) => {
    const fileResponse = await fetch(file.ServerRelativeUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/plain',
      },
    })
    const content = await fileResponse.text()
    console.log(`Contents of ${file.Name}:`, content)

    if (content) {
      const lines = content.split(/\r?\n/).filter(Boolean)
      const [head, ...records] = lines
      const mdLines = [head, '', ...records.map(transformRecord)]
      const md = mdLines.join('\n')

      const dataInfo = marked.parse(validateUrls(md))
      renderHTML(file.name, dataInfo, index)
    }
  }

  const renderHTML = (name, dataInfo, idx) => {
    const box = document.createElement('div')
    box.classList.add('box')
    box.innerHTML = dataInfo

    const tempBox = (state.boxList[idx] = document.createElement('div'))
    const dtag = document.createElement('div')
    const ptag = box.querySelector('p')
    dtag.classList.add('box-head')
    dtag.innerText = ptag.innerText
    box.prepend(dtag)
    ptag.remove()

    tempBox.innerHTML = `<!-- Start - Section: '${name}' -->\n${box.outerHTML}\n<!-- End - Section: '${name}' -->\n`

    htmlCode.value =
      `<section>` +
      state.boxList.map(box => box.innerHTML).join('') +
      `</section>`

    htmlRender.innerHTML = htmlCode.value
    tagUpdate()
  }

  const transformRecord = line => {
    const parts = line.split(',').map(p => p.trim())
    const [idx, composite, type, dateOrig, link, logoText, logoSrc, logoLink] =
      parts
    const dateUsed = dateOrig ? addMonths(dateOrig, 3) : ''
    const [pretext, code, desc, trailing] = parseComposite(composite)
    const indent = idx == 1 ? '*' : '  *'
    const openTag = type ? `<${type} date="${dateUsed}">` : ''
    const closeTag = type ? `</${type}>` : ''
    let md = link
      ? `${indent} [${pretext}${
          desc ? `<abbr title="${desc}">${code}</abbr>` : code
        }${trailing}${openTag}${closeTag}](${link})`
      : `${indent} ${pretext}${
          desc ? `<abbr title="${desc}">${code}</abbr>` : code
        }${trailing}${openTag}${closeTag}`
    if (logoText && logoSrc && logoLink) {
      md += `[![${logoText}](${logoSrc})](${logoLink})`
    }
    console.log(md)

    return md
  }

  const parseComposite = composite => {
    const match = composite.match(/(.*)\(([^)]+)\)(.*)/)
    let [pretext, code, desc, trailing] = ['', '', '', '']
    console.log(match)
    if (match) {
      const abbrs = match[2].split(' ')
      const num_digits = abbrs.length
      pretext = match[1].slice(0, -num_digits)
      code = match[1].slice(-num_digits)
      desc = match[2]
      trailing = match[3]
    }
    return match ? [pretext, code, desc, trailing] : ['', composite, '', '']
  }

  updateButton.addEventListener('click', evt => {
    evt.preventDefault()
    htmlRender.innerHTML = htmlCode.value
    tagUpdate()
  })

  copyHTML.addEventListener('click', e => {
    e.preventDefault()
    navigator.clipboard.writeText(htmlCode.value)
    alert('HTML code copied to clipboard')
  })

  const folderUrl = '/sites/de/SiteAssets/source'

  async function getTxtFilesFromSharePointFolder () {
    const endpoint = `https://hydroshare.bchydro.bc.ca/sites/de/_api/web/GetFolderByServerRelativeUrl('${folderUrl}')/Files`

    const response = await fetch(endpoint, {
      method: 'GET',

      headers: {
        Accept: 'application/json;odata=verbose',
      },
    })

    const data = await response.json()

    const txtFiles = data.d.results.filter(file => file.Name.endsWith('.txt'))

    state.fileList = Array.from(txtFiles).sort()

    state.fileList.sort((a, b) => {
      const nameA = a.Name.toUpperCase() // ignore upper and lowercase
      const nameB = b.Name.toUpperCase() // ignore upper and lowercase
      if (nameA < nameB) {
        return -1
      }
      if (nameA > nameB) {
        return 1
      }
      return 0
    })

    state.fileList.forEach((file, index) => handleFile(file, index))
  }

  getTxtFilesFromSharePointFolder()
}
