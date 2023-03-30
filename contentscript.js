let translator, tooltipManager
let isEnabled = true

if (typeof browser == "undefined") {
    browser = chrome
}
async function initialize() {
    console.log("Start Import")
    const transFile = chrome.runtime.getURL('./translator.js');
    console.log(transFile)
    translator = await import(transFile)
    const toolTipFile = chrome.runtime.getURL('./tooltip.js')
    console.log(toolTipFile)
    tooltipManager = await import(toolTipFile)
    document.addEventListener("mouseover", onMouseOver)
    document.addEventListener("mouseout", onMouseOut)

    chrome.runtime.onMessage.addListener(msg => {
        if (msg === "toggleExtension"){
            console.log("success")
            isEnabled = !isEnabled
        }
    });
}

initialize()

let nextImmediate = false
function onMouseOver(e) {
    if (!isEnabled) {
        return
    }

    if (nextImmediate) {
        onLongHover(e)
    } else {
        e.target.dataset.timeout = setTimeout(onLongHover, 200, e)
    }
}

function onMouseOut(e) {
    if (!isEnabled) {
        return
    }

    tooltipManager.hideToolTip()
    e.target.style.background = '';

    clearTimeout(e.target.dataset.timeout)
    delete e.target.dataset.timeout
}

function onLongHover(e) {
    if (e.target.dataset.hasOwnProperty('htmlCache')){
        return
    }
    console.log("hovertarget:\n", e.target.innerHTML)


    if (e.target.tagName == "IFRAME") {
        if ('listenersSet' in e.target.dataset) {
            return
        }
        e.target.contentWindow.document.addEventListener("mouseover", onMouseOver)
        e.target.contentWindow.document.addEventListener("mouseout", onMouseOut)
        e.target.dataset.listenersSet = 'true'
        console.log("added iframe listeners")
        nextImmediate = true
    }

    // get child nodes
    if (!e.target.hasChildNodes()) {
        console.log("No Child nodes")
        return
    }
    const nlist = Array.from(e.target.childNodes)
    let textNodes = []
    for (const child of nlist) {
        if (child.nodeType == Node.TEXT_NODE && child.nodeValue.replace(/\s/g, '').length) {
            textNodes.push(child)
        }
    }
    if (textNodes.length == 0)
        return
    if (nlist.length > 1) {
        cacheHTML(e.target)
        nextImmediate = true

        console.log(nlist, textNodes)
        for (let textNode of textNodes) {
            console.log("textnode: ", textNode.nodeValue)
            wrapNode.call(textNode, "span")
        }
        return
    }

    const el_html = e.target.innerHTML
    const words = el_html.match(/\S+/g)
    if (words == null)
        return
    if (words.length > 1) {
        cacheHTML(e.target)
        nextImmediate = true

        e.target.innerHTML = el_html.replace(/\S+|\s+/g, "<span>$&</span>")
        return
    }

    translateWord(e.target)
    nextImmediate = false
}

function cacheHTML(el) {
    cachedElement = el
    el.dataset.htmlCache = el.innerHTML

    function restoreCache(elem) {
        elem.innerHTML = elem.dataset.htmlCache
        delete elem.dataset.htmlCache
        elem.removeEventListener("mouseleave", onMouseLeave)
        // elem.removeEventListener("click", onClick)
    }

    function onMouseLeave(e) {
        // console.log("leave:", e.target)
        console.assert(e.target.dataset.hasOwnProperty('htmlCache'))
        restoreCache(e.target)
    }

    el.addEventListener("mouseleave", onMouseLeave)
}

function translateWord(el) {
    const hit_word = el.textContent
    // console.log("Hit Word:", hit_word)
    const transList = translator.translateWordIfArabic(hit_word)
    console.log(transList)
    if (transList != null){
        el.style.background = 'yellow'
        tooltipManager.displayToolTip(el, transList)
    }
}

function wrapNode(elemName){
    const p = this.parentNode
    const elem = document.createElement(elemName)
    p.insertBefore(elem, this)
    elem.appendChild(this)
}

function unwrapNode(){
    const p = this.parentNode
    const gp = p.parentNode
    gp.replaceChild(p, this)
}

