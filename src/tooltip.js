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

function displayTransListTooltip(el, selectRangeList, transList) {
    tooltip.innerHTML = createTransPopupHTML(transList)

    positionTooltip(el, selectRangeList)

    tooltip.style.visibility = "visible"
}

function displayTextTooltip(el, selectRangeList, text) {
    tooltip.innerHTML = createTextPopupHTML(text);
    
    positionTooltip(el, selectRangeList)
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

function OOB(r) {
    return r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth;
}

//NOTE: bottom & right are Different for js rect and css position!
function positionTooltip(el, rangeList) {
    let rl = rangeList;

    let rT = rl[0];
    let rB = rl[rl.length-1];

    let cl = {
        tr: {x: rT.right, y: rT.top},
        tl: {x: rT.left, y: rT.top},
        br: {x: rB.right, y: rB.bottom},
        bl: {x: rB.left, y: rB.bottom},
    }
    
    let ancestorIFrame = el.ownerDocument.defaultView.frameElement
    if (ancestorIFrame) {
        let ar = ancestorIFrame.getBoundingClientRect();
        Object.values(cl).forEach((c) => {c.x += ar.x; c.y += ar.y});
    }

    let c = cl.tr;
    tooltip.style.bottom = `${window.innerHeight - c.y}px`
    tooltip.style.left = `${c.x}px`
    tooltip.style.top = 'auto'
    tooltip.style.right = 'auto'
    let tipRect = tooltip.getBoundingClientRect()
    if (!OOB(tipRect))
        return;

    c = cl.br;
    tooltip.style.top = `${c.y}px`
    tooltip.style.left = `${c.x}px`
    tooltip.style.bottom = 'auto'
    tooltip.style.right = 'auto'
    tipRect = tooltip.getBoundingClientRect()
    if (!OOB(tipRect))
        return;

    c = cl.bl;
    tooltip.style.top = `${c.y}px`
    tooltip.style.right = `${window.innerWidth - c.x}px`
    tooltip.style.bottom = 'auto'
    tooltip.style.left = 'auto'
    tipRect = tooltip.getBoundingClientRect()
    if (!OOB(tipRect))
        return;

    c = cl.tl;
    tooltip.style.bottom = `${window.innerHeight - c.y}px`
    tooltip.style.right = `${window.innerWidth - c.x}px`
    tooltip.style.top = 'auto'
    tooltip.style.left = 'auto'
    tipRect = tooltip.getBoundingClientRect()
    if (!OOB(tipRect))
        return;

    throw new Error("Couldn't position tooltip within bounds on any of 4 range corners");
}

function hideToolTip() {
    tooltip.style.visibility = "hidden"
}

createToolTip()

export {displayTransListTooltip, hideToolTip, displayTextTooltip, setTextPopupHTML}