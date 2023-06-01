let translator, tooltipManager
let isEnabled = true

if (typeof browser == "undefined") {
    browser = chrome
}

async function initialize() {
    console.log("Start Import")
    const transFile = chrome.runtime.getURL('./translator.js');
    let transMod = await import(transFile)
    translator = new transMod.Translator()
    await translator.init()
    const toolTipFile = chrome.runtime.getURL('./tooltip.js');
    tooltipManager = await import(toolTipFile)

    document.addEventListener("mouseover", onMouseOver)
    document.addEventListener("mousemove", onMouseMove)

    chrome.runtime.onMessage.addListener(msg => {
        if (msg === "toggleExtension") {
            console.log("success")
            isEnabled = !isEnabled
        }
    });
}

initialize()


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
    selection.removeAllRanges();

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

async function translateWordFromPoint(el, x, y) {
    let t = getTextNodeFromPoint(el, x, y);
    if (t == null)
        return;

    let r = getCharRangeFromPoint(t, x, y);
    if (r == null)
        return;

    let s = t.nodeValue;
    let i = r.startOffset;
    let j = r.endOffset;

    if (!translator.isArabicChar(s[i]))
        return;

    while (j < s.length && translator.isArabicChar(s[j]))
        j++;
    while (i > 0 && translator.isArabicChar(s[(i - 1)]))
        i--;

    r.setStart(t, i);
    r.setEnd(t, j);
    let transList = translator.translateWordIfArabic(r.toString());
    if (transList == null)
        return

    if (transList.length > 0) {
        selectWord(r);
        tooltipManager.displayTransListTooltip(el, r.getBoundingClientRect(), transList);
        return;
    }

    selectWord(r);
    tooltipManager.displayTextTooltip(el, r.getBoundingClientRect(), "No Definition Found");

    // if arabic word typeset wrongly and has space inside
    // let ori = i, orj = j;
    // if (j < s.length && s[j] == ' ')
    //     j++;
    // if (i > 0 && s[(i - 1)] == ' ')
    //     i--;
    //
    // while (j < s.length && translator.isArabicChar(s[j]))
    //     j++;
    // while (i > 0 && translator.isArabicChar(s[(i - 1)]))
    //     i--;
    //
    // r.setStart(t, ori);
    // r.setEnd(t, j);
    // transList = translator.translateWordIfArabic(r.toString());
    // if (transList != null && transList.length > 0) {
    //     selectWord(r);
    //     tooltipManager.displayTransListTooltip(el, r.getBoundingClientRect(), transList);
    //     return;
    // }
    //
    // r.setStart(t, i);
    // r.setEnd(t, orj);
    // transList = translator.translateWordIfArabic(r.toString());
    // if (transList != null && transList.length > 0) {
    //     selectWord(r);
    //     tooltipManager.displayTransListTooltip(el, r.getBoundingClientRect(), transList);
    //     return;
    // }
    //
    // r.setStart(t, i);
    // r.setEnd(t, j);
    // transList = translator.translateWordIfArabic(r.toString());
    // if (transList != null && transList.length > 0) {
    //     selectWord(r);
    //     tooltipManager.displayTransListTooltip(el, r.getBoundingClientRect(), transList);
    //     return;
    // }

}

let sentence = false;

document.addEventListener("keyup", onKeyUp);
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
    tooltipManager.setTextPopupHTML(transSentence);
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
