javascript: (function () {
  let tripElement = 'SV3'

  const removeRows = (table, tripElement) => {
    Array.from(table.rows).forEach((row) => {
      let cells = Array.from(row.cells)

      if (row.innerText.trim() === '') {
        row.remove()
      } else if (
        cells[2].innerText.trim() === 'TR' &&
        tripElement !== cells[3].innerText.trim()
      ) {
        tripElement = cells[3].innerText.trim()
        console.log(tripElement)
      }
    })
    return tripElement
  }

  const copyLastCol = (table) => {
    Array.from(table.rows).forEach((row) => {
      let cells = Array.from(row.cells)
      let newCell = row.insertCell(-1)
      let lastCell = cells[cells.length - 1]
      newCell.outerHTML = lastCell.outerHTML
    })
  }

  const handleMech = (Table, Rows) => {
    let textInfo = createSeparator()

    Array.from(Rows).forEach((row) => {
      Array.from(row.cells).forEach((cell, index) => {
        let newRow = document.createElement('tr')
        let clone = cell.cloneNode(true)
        clone.style.whiteSpace = 'break-spaces'
        newRow.appendChild(clone)
        Table.appendChild(newRow)
        textInfo +=
          cell.textContent + (index % 5 === 4 ? createSeparator() + '\n' : '\n')
      })
      row.remove()
    })

    let headRow = Table.querySelector('tr:has(th)')
    if (headRow) {
      headRow.remove()
    }

    Table.style.fontFamily = 'monospace'

    downloadTextFile(Rows[0].cells, textInfo)
  }

  const handleDigit = (table, trip) => {
    console.log(trip)
    let tripEq = ''
    Array.from(table.rows).forEach((row) => {
      let cells = Array.from(row.cells)
      if (cells.length >= 5) {
        const elementCell = cells[2].innerText.trim()
        let deviceInfo = getDeviceNumber(elementCell)
        if (elementCell === trip) {
          row.id = 'highlight'
          cells[3].classList.add('equation')
          cells[3].id = 'equation'
          tripEq = cells[3].textContent
        }
        cells[4].innerText = deviceInfo.trim()
      }
    })
    tripEquation(table, tripEq)
    sortTableRows(table)
    removeExtraColumns(table)
    prepareTableForExport(table)
  }

  const tripEquation = (table, tripEq) => {
    let tripEqs = [tripEq]
    Array.from(table.rows).forEach((row) => {
      if (row.id != 'highlight') {
        let cells = row.querySelectorAll('td')
        if (cells.length >= 2) {
          let elementCell = cells[2].innerText.trim()
          if (elementCell.startsWith('SV')) {
            if (tripEq.includes(elementCell)) {
              tripEqs.push(cells[3].textContent)
            } else {
              row.remove()
            }
          }
        }
      }
    })

    equations = tripEqs.join('+')
    Array.from(table.rows).forEach((row) => {
      if (row.id != 'highlight') {
        let cells = row.querySelectorAll('td')
        if (cells.length >= 2) {
          let elementCell = cells[2].innerText.trim()
          const lastLetter = elementCell.slice(-1)
          const lastTwoLetters = elementCell.slice(-2)
          if (lastTwoLetters === 'TD' || lastTwoLetters === 'TC') {
            elementCell = elementCell.slice(0, -2)
          } else if (['P', 'C', 'D'].includes(lastLetter)) {
            elementCell = elementCell.slice(0, -1)
          }
          const tcEle = ['51P1TC', '51PTC']
          const defEle = { '50P2': '67P2', '50P3': '67P3', '50P4': '67P4' }
          if (
            equations.indexOf(elementCell) === -1 &&
            !tcEle.includes(elementCell)
          ) {
            if (
              defEle[elementCell] &&
              equations.includes(defEle[elementCell])
            ) {
              console.log(elementCell)
            } else {
              row.remove()
            }
          }
        }
      }
    })
  }

  const createSeparator = () => {
    return '\n' + '-'.repeat(140) + '\n'
  }
  const downloadTextFile = (rowCells, textInfo) => {
    const file = new Blob([textInfo], { type: 'text/plain' })
    let firstCellText = rowCells[0].textContent.split(' ')
    let feeder_id = `${firstCellText[0]} ${firstCellText[1]}`
    let fileName = feeder_id + ' PN Info.txt'
    let link = document.createElement('a')
    link.href = URL.createObjectURL(file)
    link.download = fileName
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const resetTableStyles = (table) => {
    Array.from(table.querySelectorAll('*')).forEach((element) => {
      element.style.cssText = ''
      while (element.attributes.length > 0) {
        element.removeAttribute(element.attributes[0].name)
      }
    })
  }
  const getDeviceNumber = (elementText) => {
    let deviceNumber = ''
    const thirdLetterMap = { G: 'GND ', P: 'PHS ', Q: 'NEG ', N: 'NEU' }
    const thirdLetter = elementText.charAt(2)
    if (thirdLetterMap[thirdLetter]) {
      deviceNumber += thirdLetterMap[thirdLetter]
    }
    if (/^50P[234]/.test(elementText)) {
      deviceNumber = 'Definite Time Pick Up(A)'
    } else if (/^67P[234]/.test(elementText)) {
      deviceNumber = 'Definite Time Delay(s)'
    } else {
      if (/^50/.test(elementText)) {
        deviceNumber += 'Inst. Overcurrent '
      } else if (/^51/.test(elementText)) {
        deviceNumber += 'Timed Overcurrent '
      }
      const suffixMap = {
        P: 'Pick Up(A)',
        C: 'Curve',
        TD: 'Time Dial',
        TC: 'Torque Control',
      }
      const lastLetter = elementText.slice(-1)
      const lastTwoLetters = elementText.slice(-2)
      if (suffixMap[lastTwoLetters]) {
        deviceNumber += suffixMap[lastTwoLetters]
      } else if (suffixMap[lastLetter]) {
        deviceNumber += suffixMap[lastLetter]
      }
    }
    if (/^50[PG]5/.test(elementText)) {
      deviceNumber += ' (Live Line)'
    }
    if (/^SV\d?\w+/.test(elementText)) {
      deviceNumber = '_Trip Equation'
    }
    return deviceNumber
  }
  const sortTableRows = (table) => {
    let rows = Array.from(table.querySelectorAll('tr:has(td)'))
    rows.sort((a, b) => {
      let aText = a.querySelectorAll('td')[4].innerText
      let bText = b.querySelectorAll('td')[4].innerText
      return aText.localeCompare(bText)
    })
    rows.forEach((row) => table.appendChild(row))
  }
  const removeExtraColumns = (table) => {
    Array.from(table.rows).forEach((row, index) => {
      let cells = row.querySelectorAll('td')
      if (index > 1 && cells.length >= 2) {
        cells[0]?.remove()
        cells[1]?.remove()
        cells[5]?.remove()
      }
    })
    if (table.rows[1]) {
      table.rows[1].querySelectorAll('td')[0].rowSpan = table.rows.length - 1
      table.rows[1].querySelectorAll('td')[1].rowSpan = table.rows.length - 1
      table.rows[1].querySelectorAll('td')[5].rowSpan = table.rows.length - 1
    }
    if (table.rows[0]) {
      table.rows[0].querySelectorAll('th')[0].textContent = 'PROTECTION'
      table.rows[0].querySelectorAll('th')[4].textContent = 'DEVICE'
      table.rows[0].querySelectorAll('th')[5].textContent = 'NOTE'
      table.rows[0].querySelectorAll('th')[5].setAttribute('width', '15%')
    }
  }
  const prepareTableForExport = (table) => {
    table.style.fontFamily = 'monospace'

    document.getElementById('highlight').style.fontWeight = 'bold'
    let myTableHTML = table.outerHTML
      .replaceAll('\n', '<br style="mso-data-placement:same-cell;"/>')
      .replaceAll('<td', '<td style="vertical-align: top;"')
    const location = 'data:application/vnd.ms-excel;base64,'
    window.location.href = location + window.btoa(myTableHTML)
  }

  let table = document.querySelector('#OutputScroll table table:last-of-type')
  if (table) {
    table.id = 'myTable'
    resetTableStyles(table)

    tripElement = removeRows(table, tripElement)

    let tRows = table.querySelectorAll('tr:has(td)')
    let rowCells = table.querySelectorAll('td[nowrap]')

    if (tRows.length < 10) {
      handleMech(table, tRows)
    } else {
      copyLastCol(table)
      handleDigit(table, tripElement)
    }
  }
})()
