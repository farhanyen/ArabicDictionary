// if (typeof browser == "undefined") {
    // browser = chrome
// }

const Mode = ({
    WORD: 0,
    PHRASE: 1,
    SENTENCE: 2
})
function InputManager() {
    this.mouseStillTimeout
    this.selectedRange
    this.translator
    this.tooltipManager
    this.isEnabled
    this.mode = Mode.WORD
    this.lastMouseMoveEvent
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
    this.lastMouseMoveEvent = e;
    let x = e.clientX, y = e.clientY;
    if (this.selectedRange) {
        if (this.withinRect(x, y, this.selectedRange.getBoundingClientRect())) {
            return;
        }

        this.unSelectRange();
        this.tooltipManager.hideToolTip();
    }

    clearTimeout(this.mouseStillTimeout);
    this.mouseStillTimeout = setTimeout(this.onMouseStill.bind(this), 100, e);
}

InputManager.prototype.onMouseStill = function(e) {
    switch (this.mode) {
        case Mode.WORD:
            this.translateWordUnderPoint(e.target, e.clientX, e.clientY);
            break;
        case Mode.PHRASE:
            this.translatePhraseUnderPoint(e.target, e.clientX, e.clientY);
            break;
        case Mode.SENTENCE:
            this.translateSentenceUnderPoint(e.target, e.clientX, e.clientY);
            break;
    }
}

InputManager.prototype.onKeyUp = function(e) {
    if (e.key == "c") {
        let m_e = this.lastMouseMoveEvent;

        if (this.mode == Mode.PHRASE) {
            this.mode = Mode.WORD;

            this.unSelectRange();
            this.tooltipManager.hideToolTip();

            this.translateWordUnderPoint(m_e.target, m_e.clientX, m_e.clientY);
        } else {
            this.mode = Mode.PHRASE;
            this.translatePhraseUnderPoint(m_e.target, m_e.clientX, m_e.clientY);
        }
    } else if (e.key == "s") {
        let m_e = this.lastMouseMoveEvent;

        if (this.mode == Mode.SENTENCE) {
            this.mode = Mode.WORD;

            this.unSelectRange();
            this.tooltipManager.hideToolTip();

            this.translateWordUnderPoint(m_e.target, m_e.clientX, m_e.clientY);
        } else {
            this.mode = Mode.SENTENCE;
            this.translateSentenceUnderPoint(m_e.target, m_e.clientX, m_e.clientY);
        }
    } else if (e.key == "v") {
        this.voiceCurrentSelection();
    }
}

// Handlers -----------------------------------------------------------------------------------------------------------

InputManager.prototype.withinRect = function(x, y, rect) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

InputManager.prototype.selectRange = function(r) {
    this.selectedRange = r
    const selection = this.selectedRange.startContainer.ownerDocument.getSelection();
    selection.removeAllRanges();

    this.selectedRange.startContainer.ownerDocument.documentElement.style.setProperty("--selection-bg-color", 'yellow');
    selection.addRange(this.selectedRange);
}

InputManager.prototype.unSelectRange = function() {
    const selection = this.selectedRange.startContainer.ownerDocument.getSelection();
    if (selection)
        selection.removeRange(this.selectedRange);

    this.selectedRange.startContainer.ownerDocument.documentElement.style.setProperty("--selection-bg-color", '#ACCEF7');
    this.selectedRange = null;
}

InputManager.prototype.getTextNodeUnderPoint = function(n, x, y) {
    if (n.nodeType == Node.TEXT_NODE) {
        return n;
    }
    
    let r = document.createRange();
    for (let i = 0; i < n.childNodes.length; i++) {
        let c = n.childNodes[i];
        r.selectNode(c);
        if (this.withinRect(x, y, r.getBoundingClientRect())) {
            return this.getTextNodeUnderPoint(c, x, y);
        }
    }
    return null;
}

InputManager.prototype.getCharRangeUnderPoint = function(t, x, y) {
    let range = document.createRange();
    range.selectNodeContents(t);

    let n = range.endOffset;
    for (let i= 0; i < n; i++) {
        range.setStart(t, i);
        range.setEnd(t,i+1);
        if (this.withinRect(x, y, range.getBoundingClientRect())) {
            return range;
        }
    }
    return null;
}

InputManager.prototype.translateSentenceUnderPoint = async function(el, x, y) {
    this.selectCurrentSentence(el, x, y);
    if (this.selectedRange == null) {
        return;
    }
    let inputSentence = this.selectedRange.toString()
    let transSentence = await this.translator.translateSentence(inputSentence);

    this.tooltipManager.displayTextTooltip(
        el, this.selectedRange.getBoundingClientRect(), transSentence
    );
}

InputManager.prototype.translateWordUnderPoint = async function(el, x, y) {
    let t = this.getTextNodeUnderPoint(el, x, y);
    if (t == null)
        return;

    let r = this.getCharRangeUnderPoint(t, x, y);
    if (r == null)
        return;

    let s = t.nodeValue, i = r.startOffset, j = r.endOffset;
    if (!this.translator.isArabicChar(s[i]))
        return;

    while (j < s.length && this.translator.isArabicChar(s[j]))
        j++;
    while (i > 0 && this.translator.isArabicChar(s[(i - 1)]))
        i--;

    r.setStart(t, i); r.setEnd(t, j);
    let transList = this.translator.translateArabicWord(r.toString());
    if (transList.length > 0) {
        this.selectRange(r);
        this.tooltipManager.displayTransListTooltip(el, r.getBoundingClientRect(), transList);
        return;
    }

    transList = this.translateSpacedWord(r);
    if (transList) {
        this.selectRange(r);
        this.tooltipManager.displayTransListTooltip(el, r.getBoundingClientRect(), transList);
        return;
    }

    this.selectRange(r);
    this.tooltipManager.displayTextTooltip(el, r.getBoundingClientRect(), "No Definition Found");
}

InputManager.prototype.translateSpacedWord = function(wordRange) {
    // if arabic word typeset wrongly and has space inside
    let r = wordRange
    let t = r.startContainer
    let s = t.nodeValue, i = r.startOffset, j = r.endOffset

    let ori = i, orj = j;
    while (j < s.length && s[j] == ' ')
        j++;
    while (i > 0 && s[(i - 1)] == ' ')
        i--;

    while (j < s.length && this.translator.isArabicChar(s[j]))
        j++;
    while (i > 0 && this.translator.isArabicChar(s[(i - 1)]))
        i--;

    r.setStart(t, ori); r.setEnd(t, j);
    let transList = this.translator.translateArabicWord(r.toString());
    if (transList.length > 0) {
        return transList;
    }

    r.setStart(t, i); r.setEnd(t, orj);
    transList = this.translator.translateArabicWord(r.toString());
    if (transList.length > 0) {
        return transList;
    }

    r.setStart(t, i); r.setEnd(t, j);
    transList = this.translator.translateArabicWord(r.toString());
    if (transList.length > 0) {
        return transList;
    }

    r.setStart(t, ori); r.setEnd(t, orj);
    return [];
}

InputManager.prototype.selectCurrentSentence = function(el, x, y) {
    let t = this.getTextNodeUnderPoint(el, x, y);
    if (t == null)
        return;

    let r = this.getCharRangeUnderPoint(t, x, y);
    if (r == null)
        return;

    let s = t.nodeValue, i = r.startOffset, j = r.endOffset;

    let endPunc = [".", "!", "؟"]

    while (i > 0 && !endPunc.includes(s[i-1]))
        i--;
    while (j < s.length && !endPunc.includes(s[j-1]))
        j++;

    r.setStart(t, i); r.setEnd(t, j);
    this.selectRange(r)
}


InputManager.prototype.translatePhraseUnderPoint = async function(el, x, y) {
    this.selectCurrentPhrase(el, x, y);
    if (this.selectedRange == null) {
        return;
    }
    let inputPhrase = this.selectedRange.toString()
    let transPhrase = await this.translator.translateSentence(inputPhrase);

    this.tooltipManager.displayTextTooltip(
        el, this.selectedRange.getBoundingClientRect(), transPhrase
    );
}

InputManager.prototype.selectCurrentPhrase = function(el, x, y) {
    let t = this.getTextNodeUnderPoint(el, x, y);
    if (t == null)
        return;

    let r = this.getCharRangeUnderPoint(t, x, y);
    if (r == null)
        return;

    let s = t.nodeValue, i = r.startOffset, j = r.endOffset;

    let endPunc = [".", "!", "؟", ":", "،", ",", "—"]

    while (i > 0 && !endPunc.includes(s[i-1]))
        i--;
    while (j < s.length && !endPunc.includes(s[j-1]))
        j++;

    r.setStart(t, i); r.setEnd(t, j);
    this.selectRange(r);
}

InputManager.prototype.voiceCurrentSelection = async function() {
    console.log("v fired");
    if (this.selectedRange == null)
        return;

    await new Promise((resolve) => {
        chrome.runtime.sendMessage({
            contentScriptQuery: "tts",
            text: this.selectedRange.toString()
        }, (response) => {
            resolve(response)
        })
    })
}

let inputManager = new InputManager()
inputManager.initialize();