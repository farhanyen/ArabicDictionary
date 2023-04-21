let translator, tooltipManager
let isEnabled = true

if (typeof browser == "undefined") {
    browser = chrome
}

async function initialize() {
    console.log("Start Import")
    const transFile = chrome.runtime.getURL('./translator.js');
    // const transFile = './translator.js';
    translator = await import(transFile)
    const toolTipFile = chrome.runtime.getURL('./tooltip.js');
    // const toolTipFile = './tooltip.js';
    tooltipManager = await import(toolTipFile)
    // document.addEventListener("mouseover", onMouseOverSpan)
    // document.addEventListener("mouseout", onMouseOutSpan)
    document.addEventListener("mouseover", onMouseOver)
    // document.addEventListener("mouseout", onMouseOutSpan)
    document.addEventListener("mousemove", onMouseMove)

    chrome.runtime.onMessage.addListener(msg => {
        if (msg === "toggleExtension") {
            console.log("success")
            isEnabled = !isEnabled
        }
    });

    // let link = document.createElement("link");
    // link.type = "text/css";
    // link.rel = "stylesheet";
    // link.href =  chrome.runtime.getURL("./selection.css");
    // // document.head.appendChild(link);
}

initialize()


let nextImmediate = false

function onMouseOverSpan(e) {
    if (!isEnabled) {
        return
    }

    if (e.target.tagName == "IFRAME" && !('listenersSet' in e.target.dataset)) {
        e.target.contentWindow.document.addEventListener("mouseover", onMouseOverSpan)
        e.target.contentWindow.document.addEventListener("mouseout", onMouseOutSpan)
        e.target.dataset.listenersSet = 'true'
    }

    if (nextImmediate) {
        onLongHover(e)
    } else {
        e.target.dataset.timeout = setTimeout(onLongHover, 500, e)
    }
}

function onMouseOutSpan(e) {
    if (!isEnabled) {
        return
    }

    tooltipManager.hideToolTip()
    e.target.style.background = '';

    clearTimeout(e.target.dataset.timeout)
    delete e.target.dataset.timeout
}

function onLongHover(e) {
    if (e.target.dataset.hasOwnProperty('htmlCache')) {
        return
    }
    // console.log("hovertarget:\n", e.target.innerHTML)

    translateWordSpan(e);
    // translateWordFromPoint(e.target, e.clientX, e.clientY);
}

function translateWordSpan(e) {
    if (e.target.tagName == "IFRAME") {
        return
    }

    const nlist = Array.from(e.target.childNodes)
    const textNodes = nlist.filter(n =>
        n.nodeType == Node.TEXT_NODE &&
        n.nodeValue.replace(/\s/g, '').length);
    if (textNodes.length == 0)
        return
    if (nlist.length > 1) {
        cacheHTML(e.target)
        nextImmediate = true
        for (let textNode of textNodes) {
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

        e.target.innerHTML = el_html.replace(/\S+|\s+/g, "<span style='position:static'>$&</span>")
        return
    }

    translateWord(e.target)
    nextImmediate = false
}


function cacheHTML(el) {
    return;
    cachedElement = el
    el.dataset.htmlCache = el.innerHTML

    function restoreCache(elem) {
        elem.innerHTML = elem.dataset.htmlCache
        delete elem.dataset.htmlCache
        elem.removeEventListener("mouseleave", onMouseLeave)
    }

    function onMouseLeave(e) {
        console.assert(e.target.dataset.hasOwnProperty('htmlCache'))
        restoreCache(e.target)
    }

    el.addEventListener("mouseleave", onMouseLeave)
}

function translateWord(el) {
    const hit_word = el.textContent
    // console.log("Hit Word:", hit_word)
    const transList = translator.translateWordIfArabic(hit_word)
    //console.log(transList)
    if (transList != null) {
        el.style.background = 'yellow';
        tooltipManager.displayToolTip(el, el.getBoundingClientRect(), transList)
    }
}

function wrapNode(elemName) {
    const p = this.parentNode
    const elem = document.createElement(elemName)
    p.insertBefore(elem, this)
    elem.appendChild(this)
}

function unwrapNode() {
    const p = this.parentNode
    const gp = p.parentNode
    gp.replaceChild(p, this)
}

let mouseStillTimeout, wordRange

function onMouseOver(e) {
    if (e.target.tagName == "IFRAME") {
        // clearTimeout(mouseStillTimeout);

        if (!('listenersSet' in e.target.dataset)) {
            e.target.contentWindow.document.addEventListener("mouseover", onMouseOver);
            e.target.contentWindow.document.addEventListener("mousemove", onMouseMove);
            e.target.contentWindow.document.addEventListener("keyup", onKeyUp);
            e.target.dataset.listenersSet = 'true';
        }
    }
}

function onMouseMove(e) {
    let x = e.clientX, y = e.clientY;
    if (wordRange) {
        if (within(x, y, wordRange.getBoundingClientRect())) {
            return;
        }

        unSelectWord();
        tooltipManager.hideToolTip();
    }

    clearTimeout(mouseStillTimeout);
    mouseStillTimeout = setTimeout(onMouseStill, 100, e);
}

function onMouseStill(e) {
    // console.log(e.target, e.clientX, e.clientY);
    translateWordFromPoint(e.target, e.clientX, e.clientY);
}

function within(x, y, rect) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function selectWord(r) {
    wordRange = r
    const selection = wordRange.startContainer.ownerDocument.getSelection();
    // if (selection.rangeCount == 1 && selection.getRangeAt(0).toString() == '') {
    selection.removeAllRanges();
    // }
    wordRange.startContainer.ownerDocument.documentElement.style.setProperty("--selection-bg-color", 'yellow');
    selection.addRange(wordRange);
}

function unSelectWord() {
    const selection = wordRange.startContainer.ownerDocument.getSelection();
    if (selection)
        selection.removeRange(wordRange);

    wordRange.startContainer.ownerDocument.documentElement.style.setProperty("--selection-bg-color", '#ACCEF7');
    wordRange = null;
    sentence = false;
}

function getTextNodeFromPoint(n, x, y) {
    if (n.nodeType == Node.TEXT_NODE) {
        return n;
    }
    range = document.createRange();
    for (let i = 0; i < n.childNodes.length; i++) {
        let c = n.childNodes[i];
        range.selectNode(c);
        if (within(x, y, range.getBoundingClientRect())) {
            return getTextNodeFromPoint(c, x, y);
        }
    }
    return null;
}

function getCharRangeFromPoint(t, x, y) {
    let range = document.createRange();
    range.selectNodeContents(t);

    let endPos = range.endOffset;
    for (let curPos = 0; curPos < endPos; curPos++) {
        range.setStart(t, curPos);
        range.setEnd(t, curPos + 1);
        if (within(x, y, range.getBoundingClientRect())) {
            return range;
        }
    }
    return null;
}

// function expandCharRange
function expandCharRangeToWord(r) {
    let t = r.startContainer;
    let s = t.nodeValue
    let i = r.startOffset;
    let j = r.endOffset;

    while (j < s.length && s[j] != ' ')
        j++;
    while ((i - 1) >= 0 && s[(i - 1)] != ' ')
        i--;

    r.setStart(t, i);
    r.setEnd(t, j);
}

// document.addEventListener("keydowm", onKeyDown);
document.addEventListener("keyup", onKeyUp);


// function onKeyDown(e) {
//     if (e.key == 's' && !e.repeat)
//         translateCurrentSentence();
// }
let sentence = false;

function onKeyUp(e) {
    if (e.key == "s") {
        if (sentence) {
            sentence = false;
            unSelectWord();
            tooltipManager.hideToolTip();
        } else {
            translateCurrentSentence();
        }
    } else if (e.key == "v") {
        voiceCurrentSelection();
    }
}

async function translateCurrentSentence() {
    if (wordRange == null)
        return;
    selectCurrentSentence();
    let inputSentence = wordRange.toString()
    let transSentence = await translator.translateSentence(inputSentence);
    console.log(transSentence)
    tooltipManager.setSentenceTransPopup(transSentence);
    sentence = true;
}



function selectCurrentSentence() {
    let r = wordRange;
    let t = r.startContainer;
    let s = t.nodeValue
    let i = r.startOffset;
    let j = r.endOffset;

    let endPunc = [".", "!", "؟"]

    while ((i - 1) >= 0 && !endPunc.includes(s[i-1]))
        i--;
    while (j < s.length && !endPunc.includes(s[j-1]))
        j++;

    r.setStart(t, i);
    r.setEnd(t, j);
}

async function voiceCurrentSelection() {
    console.log("v fired");
    if (wordRange == null)
        return;
    const apiroot = "https://translate.googleapis.com/translate_tts?";
    let params = {
        client: "gtx",
        ie: ":UTF-8",
        tl: "ar",
        tk: "435555.435555",
        q: wordRange.toString()
    };
    const paramStr = new URLSearchParams(params);
    const url = apiroot + paramStr;

    const response = await fetch(url, {method: "GET"});
    if (response.status != 200)
        return null;

    const ctx = new AudioContext();
    let audioBuf = await response.arrayBuffer();
    let audio = await ctx.decodeAudioData(audioBuf);

    const playSound = ctx.createBufferSource();
    playSound.buffer = audio;
    playSound.connect(ctx.destination);
    playSound.start(ctx.currentTime);
}

function translateWordFromPoint(el, x, y) {
    let t = getTextNodeFromPoint(el, x, y);
    if (t == null)
        return;

    let r = getCharRangeFromPoint(t, x, y);
    if (r == null)
        return;

    // let t = r.startContainer;
    let s = t.nodeValue;
    let i = r.startOffset;
    let j = r.endOffset;

    if (!translator.isArabicChar(s[i]))
        return;
    while (j < s.length && translator.isArabicChar(s[j]))
        j++;
    while ((i - 1) >= 0 && translator.isArabicChar(s[(i - 1)]))
        i--;

    r.setStart(t, i);
    r.setEnd(t, j);
    let transList = translator.translateWordIfArabic(r.toString());
    if (transList != null && transList.length > 0) {
        selectWord(r);
        tooltipManager.displayToolTip(el, r.getBoundingClientRect(), transList);
        return;
    }

    let orTransList = transList;
    let ori = i, orj = j;
    if (j < s.length && s[j] == ' ')
        j++;
    if ((i - 1) >= 0 && s[(i - 1)] == ' ')
        i--;

    while (j < s.length && translator.isArabicChar(s[j]))
        j++;
    while ((i - 1) >= 0 && translator.isArabicChar(s[(i - 1)]))
        i--;

    r.setStart(t, ori);
    r.setEnd(t, j);
    transList = translator.translateWordIfArabic(r.toString());
    if (transList != null && transList.length > 0) {
        selectWord(r);
        tooltipManager.displayToolTip(el, r.getBoundingClientRect(), transList);
        return;
    }

    r.setStart(t, i);
    r.setEnd(t, orj);
    transList = translator.translateWordIfArabic(r.toString());
    if (transList != null && transList.length > 0) {
        selectWord(r);
        tooltipManager.displayToolTip(el, r.getBoundingClientRect(), transList);
        return;
    }

    r.setStart(t, i);
    r.setEnd(t, j);
    transList = translator.translateWordIfArabic(r.toString());
    if (transList != null && transList.length > 0) {
        selectWord(r);
        tooltipManager.displayToolTip(el, r.getBoundingClientRect(), transList);
        return;
    }

    r.setStart(t, ori);
    r.setEnd(t, orj);
    transList = orTransList;
    if (transList != null) {
        selectWord(r);
        tooltipManager.displayToolTip(el, r.getBoundingClientRect(), transList);
    }
}