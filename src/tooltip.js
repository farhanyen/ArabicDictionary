
function Tooltip() {
    this.createToolTip()
}

Tooltip.prototype.createToolTip = function() {
    this.tooltip = document.createElement("span")
    this.tooltip.id = "transToolTip"
    const tooltipCSSText = `
            visibility: hidden;
            position: fixed;
            z-index: 100;
        `
    // console.log(tooltipCSSText)
    this.tooltip.style.cssText = tooltipCSSText
    // console.log(tooltip.style.cssText)

    document.body.appendChild(this.tooltip)
}

Tooltip.prototype.displayTransListTooltip = function(el, selectRangeList, transList) {
    this.tooltip.innerHTML = this.createTransPopupHTML(transList)

    this.positionTooltip(el, selectRangeList)

    this.tooltip.style.visibility = "visible"
}

Tooltip.prototype.displayTextTooltip = function(el, selectRangeList, text) {
    this.tooltip.innerHTML = this.createTextPopupHTML(text);

    this.positionTooltip(el, selectRangeList)
    this.tooltip.style.visibility = "visible"
}


Tooltip.prototype.createTransPopupHTML = function(transList) {
    let str = ""
    str += "<table class = 'tooltip-table'>"
    if (transList.length == 0) {
        str += "<tr>"
        str += "<td>No definition found</td>"
        str += "</tr>"
        str += "</table>"
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

Tooltip.prototype.createTextPopupHTML = function(text) {
    let str = ""
    str += "<table class = 'tooltip-table'>"

    str += "<tr>"
    str += `<td>${text}</td>`
    str += "</tr>"

    return str
}

Tooltip.prototype.setTextPopupHTML = function(text) {
    this.tooltip.innerHTML = this.createTextPopupHTML(text)
}

Tooltip.prototype.appendHTML = function(html) {
    this.tooltip.innerHTML += html;
}

Tooltip.prototype.OOB = function(r) {
    return r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth;
}

//NOTE: bottom & right are Different for rect (js) and position (css)!
Tooltip.prototype.positionTooltip = function(el, rangeList) {
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
    this.tooltip.style.bottom = `${window.innerHeight - c.y}px`
    this.tooltip.style.left = `${c.x}px`
    this.tooltip.style.top = 'auto'
    this.tooltip.style.right = 'auto'
    let tipRect = this.tooltip.getBoundingClientRect()
    if (!this.OOB(tipRect))
        return;

    c = cl.br;
    this.tooltip.style.top = `${c.y}px`
    this.tooltip.style.left = `${c.x}px`
    this.tooltip.style.bottom = 'auto'
    this.tooltip.style.right = 'auto'
    tipRect = this.tooltip.getBoundingClientRect()
    if (!this.OOB(tipRect))
        return;

    c = cl.bl;
    this.tooltip.style.top = `${c.y}px`
    this.tooltip.style.right = `${window.innerWidth - c.x}px`
    this.tooltip.style.bottom = 'auto'
    this.tooltip.style.left = 'auto'
    tipRect = this.tooltip.getBoundingClientRect()
    if (!this.OOB(tipRect))
        return;

    c = cl.tl;
    this.tooltip.style.bottom = `${window.innerHeight - c.y}px`
    this.tooltip.style.right = `${window.innerWidth - c.x}px`
    this.tooltip.style.top = 'auto'
    this.tooltip.style.left = 'auto'
    tipRect = this.tooltip.getBoundingClientRect()
    if (!this.OOB(tipRect))
        return;

    throw new Error("Couldn't position this.tooltip within bounds on any of 4 range corners");
}

Tooltip.prototype.hideToolTip = function() {
    this.tooltip.style.visibility = "hidden"
}


export default Tooltip