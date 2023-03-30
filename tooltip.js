let tooltip
function createToolTip() {
    tooltip = document.createElement("span")
    tooltip.id = "transToolTip"
    const tooltipCSSText = `
            visibility: hidden;
            position: fixed;
            z-index: 100;
        `
    // console.log(tooltipCSSText)
    tooltip.style.cssText = tooltipCSSText
    // console.log(tooltip.style.cssText)

    document.body.appendChild(tooltip)
}

function createTransPopupHTML(transList) {
    let str = ""
    str += "<table class = 'tooltip-table'>"
    if (transList.length == 0) {
        str += "<tr>"
        str += "<td>No definition found</td>"
        str += "</tr>"
        str += "</table>"
        str += "</div>"
        return str
    }

    str += "<tr>"
    str += "<th>Word</th>"
    str += "<th>Definition</th>"
    str += "<th>Root</th>"
    str += "</tr>"
    for (const trans of transList) {
        str += "<tr>"
        str += `<td class = 'arabic-text'>${trans.word}</td>`
        str += `<td>${trans.def}</td>`
        str += `<td class = 'arabic-text'>${trans.root}</td>`
        str += "</tr>"
    }

    str += "</table>"
    return str
}
function displayToolTip(el, transList) {
    tooltip.innerHTML = createTransPopupHTML(transList)

    positionTooltip(el)

    tooltip.style.visibility = "visible"
}

function positionTooltip(el) {
    let wordRect = JSON.parse(JSON.stringify(el.getBoundingClientRect()))
    
    let ancestorIFrame = el.ownerDocument.defaultView.frameElement
    if (ancestorIFrame) {
        console.log(ancestorIFrame)
        let ancRect = ancestorIFrame.getBoundingClientRect()
        Array.from(['left','right','x']).forEach(key => {wordRect[key] += ancRect['x']})
        Array.from(['top','bottom','y']).forEach(key => {wordRect[key] += ancRect['y']})
    }
    
    tooltip.style.bottom = `${window.innerHeight - wordRect.y}px`
    tooltip.style.top = "auto"
    tooltip.style.left = `${wordRect.x+wordRect.width}px`
    tooltip.style.right = "auto"

    let tipRect = tooltip.getBoundingClientRect()
    if (tipRect.top < 0) {
        tooltip.style.bottom = "auto"
        tooltip.style.top = `${wordRect.y+wordRect.height}px`
    }
    if (tipRect.right > window.innerWidth) {
        tooltip.style.left = "auto"
        tooltip.style.right = `${window.innerWidth - wordRect.x}px`
    }
    tipRect = tooltip.getBoundingClientRect()
    // console.log(`Top: ${tipRect.top} Bottom: ${tipRect.bottom} Left: ${tipRect.left} Right: ${tipRect.right}`)
}

function hideToolTip() {
    tooltip.style.visibility = "hidden"
}

createToolTip()

export {displayToolTip, hideToolTip}