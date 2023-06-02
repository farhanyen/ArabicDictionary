


if (typeof browser == "undefined") {
    // browser = chrome
}

function InputManager() {
    this.mouseStillTimeout
    this.curRange
    this.translator
    this.tooltipManager
    this.isEnabled
}

InputManager.prototype.initialize = async function() {
    console.log("Start Import")
    
    const transFile = chrome.runtime.getURL('./translator.js');
    let transMod = await import(transFile)
    this.translator = new transMod.Translator()
    await this.translator.init()
    
    const toolTipFile = chrome.runtime.getURL('./tooltip.js');
    this.tooltipManager = await import(toolTipFile)

    document.addEventListener("mouseover", this.onMouseOver.bind(this))
    document.addEventListener("mousemove", this.onMouseMove.bind(this))
    document.addEventListener("keyup", this.onKeyUp.bind(this));



    chrome.runtime.onMessage.addListener(msg => {
        if (msg === "toggleExtension") {
            console.log("success")
            this.isEnabled = !this.isEnabled
        }
    });
}

InputManager.prototype.onMouseOver = function(e) {
    if (e.target.tagName == "IFRAME") {
        // clearTimeout(this.mouseStillTimeout);

        if (!('listenersSet' in e.target.dataset)) {
            e.target.contentWindow.document.addEventListener("mouseover", this.onMouseOver.bind(this));
            e.target.contentWindow.document.addEventListener("mousemove", this.onMouseMove.bind(this));
            e.target.contentWindow.document.addEventListener("keyup", this.onKeyUp.bind(this));
            e.target.dataset.listenersSet = 'true';
        }
    }
}

InputManager.prototype.onMouseMove = function(e) {
    let x = e.clientX, y = e.clientY;
    if (this.curRange) {
        if (this.within(x, y, this.curRange.getBoundingClientRect())) {
            return;
        }

        this.unselectRange();
        this.tooltipManager.hideToolTip();
    }

    clearTimeout(this.mouseStillTimeout);
    this.mouseStillTimeout = setTimeout(this.onMouseStill.bind(this), 100, e);
}

InputManager.prototype.onMouseStill = function(e) {
    // console.log(e.target, e.clientX, e.clientY);
    this.translateWordUnderPoint(e.target, e.clientX, e.clientY);
}

InputManager.prototype.within = function(x, y, rect) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

InputManager.prototype.selectRange = function(r) {
    this.curRange = r
    const selection = this.curRange.startContainer.ownerDocument.getSelection();
    selection.removeAllRanges();

    this.curRange.startContainer.ownerDocument.documentElement.style.setProperty("--selection-bg-color", 'yellow');
    selection.addRange(this.curRange);
}

InputManager.prototype.unselectRange = function() {
    const selection = this.curRange.startContainer.ownerDocument.getSelection();
    if (selection)
        selection.removeRange(this.curRange);

    this.curRange.startContainer.ownerDocument.documentElement.style.setProperty("--selection-bg-color", '#ACCEF7');
    this.curRange = null;
    sentence = false;
}

InputManager.prototype.getTextNodeUnderPoint = function(n, x, y) {
    if (n.nodeType == Node.TEXT_NODE) {
        return n;
    }
    
    let r = document.createRange();
    for (let i = 0; i < n.childNodes.length; i++) {
        let c = n.childNodes[i];
        r.selectNode(c);
        if (this.within(x, y, r.getBoundingClientRect())) {
            return this.getTextNodeUnderPoint(c, x, y);
        }
    }
    return null;
}

InputManager.prototype.getCharRangeUnderPoint = function(t, x, y) {
    let range = document.createRange();
    range.selectNodeContents(t);

    let n = range.endOffset;
    for (let i = 0; i < n; i++) {
        range.setStart(t, i);
        range.setEnd(t, i+1);
        if (this.within(x, y, range.getBoundingClientRect())) {
            return range;
        }
    }
    return null;
}

InputManager.prototype.translateWordUnderPoint = async function(el, x, y) {
    let t = this.getTextNodeUnderPoint(el, x, y);
    if (t == null)
        return;

    let r = this.getCharRangeUnderPoint(t, x, y);
    if (r == null)
        return;

    let s = t.nodeValue;
    let i = r.startOffset;
    let j = r.endOffset;

    if (!this.translator.isArabicChar(s[i]))
        return;

    while (j < s.length && this.translator.isArabicChar(s[j]))
        j++;
    while (i > 0 && this.translator.isArabicChar(s[(i - 1)]))
        i--;

    r.setStart(t, i);
    r.setEnd(t, j);
    let transList = this.translator.translateArabicWord(r.toString());

    if (transList.length > 0) {
        this.selectRange(r);
        this.tooltipManager.displayTransListTooltip(el, r.getBoundingClientRect(), transList);
        return;
    }

    this.selectRange(r);
    this.tooltipManager.displayTextTooltip(el, r.getBoundingClientRect(), "No Definition Found");

    // if arabic word typeset wrongly and has space inside
    // let ori = i, orj = j;
    // if (j < s.length && s[j] == ' ')
    //     j++;
    // if (i > 0 && s[(i - 1)] == ' ')
    //     i--;
    //
    // while (j < s.length && this.translator.isArabicChar(s[j]))
    //     j++;
    // while (i > 0 && this.translator.isArabicChar(s[(i - 1)]))
    //     i--;
    //
    // r.setStart(t, ori);
    // r.setEnd(t, j);
    // transList = this.translator.translateWordIfArabic(r.toString());
    // if (transList != null && transList.length > 0) {
    //     this.selectRange(r);
    //     this.tooltipManager.displayTransListTooltip(el, r.getBoundingClientRect(), transList);
    //     return;
    // }
    //
    // r.setStart(t, i);
    // r.setEnd(t, orj);
    // transList = this.translator.translateWordIfArabic(r.toString());
    // if (transList != null && transList.length > 0) {
    //     this.selectRange(r);
    //     this.tooltipManager.displayTransListTooltip(el, r.getBoundingClientRect(), transList);
    //     return;
    // }
    //
    // r.setStart(t, i);
    // r.setEnd(t, j);
    // transList = this.translator.translateWordIfArabic(r.toString());
    // if (transList != null && transList.length > 0) {
    //     this.selectRange(r);
    //     this.tooltipManager.displayTransListTooltip(el, r.getBoundingClientRect(), transList);
    //     return;
    // }
}

let sentence = false;

InputManager.prototype.onKeyUp = function(e) {
    if (e.key == "s") {
        if (sentence) {
            sentence = false;
            this.unselectRange();
            this.tooltipManager.hideToolTip();
        } else {
            this.translateCurrentSentence();
        }
    } else if (e.key == "v") {
        this.voiceCurrentSelection();
    }
}

InputManager.prototype.translateCurrentSentence = async function() {
    if (this.curRange == null)
        return;
    this.selectCurrentSentence();
    let inputSentence = this.curRange.toString()
    let transSentence = await this.translator.translateSentence(inputSentence);
    console.log(transSentence)
    this.tooltipManager.setTextPopupHTML(transSentence);
    sentence = true;
}

InputManager.prototype.selectCurrentSentence = function() {
    let r = this.curRange;
    let t = r.startContainer;
    let s = t.nodeValue
    let i = r.startOffset;
    let j = r.endOffset;

    let endPunc = [".", "!", "؟"]

    while (i > 0 && !endPunc.includes(s[i-1]))
        i--;
    while (j < s.length && !endPunc.includes(s[j-1]))
        j++;

    r.setStart(t, i);
    r.setEnd(t, j);
}

InputManager.prototype.voiceCurrentSelection = async function() {
    console.log("v fired");
    if (this.curRange == null)
        return;

    await new Promise((resolve) => {
        chrome.runtime.sendMessage({
            contentScriptQuery: "tts",
            text: this.curRange.toString()
        }, (response) => {
            resolve(response)
        })
    })
}

let inputManager = new InputManager()
inputManager.initialize();