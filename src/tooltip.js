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

function displayTransListTooltip(el, selectRect, transList) {
    tooltip.innerHTML = createTransPopupHTML(transList)

    positionTooltip(el, selectRect)

    tooltip.style.visibility = "visible"
}

function displayTextTooltip(el, selectRect, text) {
    tooltip.innerHTML = createTextPopupHTML(text);
    
    positionTooltip(el, selectRect)
    tooltip.style.visibility = "visible"
}


function createTransPopupHTML(transList) {
    let str = ""
    str += "<table class = 'tooltip-table'>"
    if (transList.length == 0) {
        str += "<tr>"
        str += "<td>No definition found</td>"
        str += "</tr>"
        str += "</table>"
        // str += "</div>"
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

function createTextPopupHTML(text) {
    let str = ""
    str += "<table class = 'tooltip-table'>"

    str += "<tr>"
    str += `<td>${text}</td>`
    str += "</tr>"

    return str
}

function setTextPopupHTML(text) {
    tooltip.innerHTML = createTextPopupHTML(text)
}

function positionTooltip(el, selectRect) {
    let r = JSON.parse(JSON.stringify(selectRect))
    
    let ancestorIFrame = el.ownerDocument.defaultView.frameElement
    if (ancestorIFrame) {
        // console.log(ancestorIFrame)
        let ar = ancestorIFrame.getBoundingClientRect()
        Array.from(['left','right','x']).forEach(key => {r[key] += ar['x']})
        Array.from(['top','bottom','y']).forEach(key => {r[key] += ar['y']})
    }
    
    tooltip.style.bottom = `${window.innerHeight - r.y}px`
    tooltip.style.top = "auto"
    tooltip.style.left = `${r.x+r.width}px`
    tooltip.style.right = "auto"

    let tipRect = tooltip.getBoundingClientRect()
    if (tipRect.top < 0) {
        tooltip.style.bottom = "auto"
        tooltip.style.top = `${r.y+r.height}px`
    }
    if (tipRect.right > window.innerWidth) {
        tooltip.style.left = "auto"
        tooltip.style.right = `${window.innerWidth - r.x}px`
    }
    tipRect = tooltip.getBoundingClientRect()
    // console.log(`Top: ${tipRect.top} Bottom: ${tipRect.bottom} Left: ${tipRect.left} Right: ${tipRect.right}`)
}

function hideToolTip() {
    tooltip.style.visibility = "hidden"
}

createToolTip()

export {displayTransListTooltip, hideToolTip, displayTextTooltip, setTextPopupHTML}