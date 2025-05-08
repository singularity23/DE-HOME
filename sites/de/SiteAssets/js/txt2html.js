
window.onload = () => {
  let fileList = []
  let boxList = []
  const input = document.getElementById('file-container').querySelector('input')
  const preview = document.querySelector('.preview')
  const loadDataButton = document.getElementById('loadData')
  const copyHTML = document.getElementById('copyHTML')
  const updateButton = document.getElementById('updateHTML')
  const saveButton = document.getElementById('saveMD')
  let htmlCode = document.getElementById('html-code')
  let htmlRender = document.getElementById('html-render')

  const updateDisplay = () => {
    preview.innerHTML = '' // Clear preview

    const { files } = input

    if (!files || files.length === 0) {
      preview.innerHTML = '<p>No files currently selected for upload</p>'
    } else {
      const list = document.createElement('div')
      const fileNames = Array.from(files).map(file => file.name)
      fileList = Array.from(files).sort()
      list.innerHTML = `<span>${fileNames.join(', ')}</span>`
      preview.appendChild(list)
    }
  }

  input.style.opacity = 0
  input.style.width = 0
  input.addEventListener('change', updateDisplay)

  function addMonths (ymd, months) {
    const [y, m, d] = ymd.split('-').map(n => parseInt(n, 10))
    const dt = new Date(y, m - 1 + months, d)
    const yy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }

  loadDataButton.addEventListener('click', evt => {
    evt.preventDefault()
    fileList.forEach((file, index) => handleFile(file, index))
  })

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

  const handleFile = (file, index) => {
    const reader = new FileReader()
    reader.onload = e => {
      const content = validateUrls(e.target.result)
      console.log(content)
      if (content) {
        const lines = content.split(/\r?\n/).filter(l => l.trim())
        const [head, ...records] = lines
        console.log(records)
        const mdLines = [head, '']
        console.log(mdLines)
        records.forEach(ln => mdLines.push(transformRecord(ln)))
        const md = mdLines.join('\n')
        console.log(md)
        let data = validateUrls(md)
        dataInfo = marked.parse(data)
        console.log(dataInfo)
        renderHTML(file.name, dataInfo, index)
      }
    }
    reader.readAsText(file)
  }

  function renderHTML (name, dataInfo, idx) {
    console.log(idx);
    const box = document.createElement('div')
    box.classList.add('box')
    box.innerHTML = dataInfo

    const tempBox = (boxList[idx] = document.createElement('div'))
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
    if (boxList.length - 1 === idx) {
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

  updateButton.addEventListener('click', evt => {
    evt.preventDefault()
    fetchAndProcessData()
  })
}
