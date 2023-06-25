// if (typeof browser == "undefined") {
    // browser = chrome
// }

const Mode = ({
    WORD: 0,
    PHRASE: 1,
    SENTENCE: 2
})

const TransType = {
    TEXT: 0,
    TRANSLIST: 1
}
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
    document.addEventListener("keydown", this.onKeyDown.bind(this));
    
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
            e.target.contentWindow.document.addEventListener("keydown", this.onKeyDown.bind(this));
            e.target.dataset.listenersSet = 'true';
        }
    }
}

InputManager.prototype.onMouseMove = function(e) {
    this.lastMouseMoveEvent = e;
    let x = e.clientX, y = e.clientY;
    if (this.selectedRange) {
        if (this.withinRange(x, y, this.selectedRange)) {
            return;
        }

        this.unSelectRange();
        this.tooltipManager.hideToolTip();
    }

    clearTimeout(this.mouseStillTimeout);
    if (!(e.buttons & 1))
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

InputManager.prototype.onKeyDown = async function(e) {
    if (e.metaKey || e.repeat)
        return;

    let m_e = this.lastMouseMoveEvent;
    switch (e.key) {
        case 'a':
            let wRange = this.getWordRangeUnderPoint(m_e.target, m_e.clientX, m_e.clientY).toString();
            if (wRange == null)
                return;
            let sRange= this.getSentenceRangeUnderPoint(m_e.target, m_e.clientX, m_e.clientY).toString();

            let curWord = wRange.toString(), curSentence = sRange.toString();

            let wordTrans = this.translator.translateArabicWord(curWord);
            let sentenceTrans = await this.translator.gTranslateSentence(curSentence);

            console.log(curWord); console.log(curSentence); console.log(wordTrans); console.log(sentenceTrans);
            break;
        case 'w':
            this.unSelectRange();
            this.tooltipManager.hideToolTip();

            this.mode = Mode.WORD;
            this.translateWordUnderPoint(m_e.target, m_e.clientX, m_e.clientY);
            break;
        case 'c':
            this.unSelectRange();
            this.tooltipManager.hideToolTip();

            if (this.mode == Mode.PHRASE) {
                this.mode = Mode.WORD;
                this.translateWordUnderPoint(m_e.target, m_e.clientX, m_e.clientY);
            } else {
                this.mode = Mode.PHRASE;
                this.translatePhraseUnderPoint(m_e.target, m_e.clientX, m_e.clientY);
            }
            break;
        case 's':
            this.unSelectRange();
            this.tooltipManager.hideToolTip();

            if (this.mode == Mode.SENTENCE) {
                this.mode = Mode.WORD;
                this.translateWordUnderPoint(m_e.target, m_e.clientX, m_e.clientY);
            } else {
                this.mode = Mode.SENTENCE;
                this.translateSentenceUnderPoint(m_e.target, m_e.clientX, m_e.clientY);
            }
            break;
        case 'v':
            this.voiceCurrentSelection();
            break;
    }
}

// Handlers -----------------------------------------------------------------------------------------------------------

InputManager.prototype.withinRect = function(x, y, rect) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

InputManager.prototype.withinRange = function(x, y, range) {
    for (let r of range.getClientRects()) {
        if (this.withinRect(x, y, r))
            return true;
    }
    return false;
}

InputManager.prototype.selectRange = function(r) {
    const selection = r.startContainer.ownerDocument.getSelection();
    selection.removeAllRanges();

    r.startContainer.ownerDocument.documentElement.style.setProperty("--selection-bg-color", 'yellow');
    selection.addRange(r);
    // r.startContainer.parentElement.focus();

    this.selectedRange = r;
}

InputManager.prototype.unSelectRange = function() {
    if (this.selectedRange == null)
        return;
    const selection = this.selectedRange.startContainer.ownerDocument.getSelection();
    if (selection)
        selection.removeAllRanges();

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
    let r = document.createRange();
    r.selectNodeContents(t);

    let n = r.endOffset;
    for (let i= 0; i < n; i++) {
        r.setStart(t, i); r.setEnd(t,i+1);
        if (this.withinRect(x, y, r.getBoundingClientRect())) {
            return r;
        }
    }
    return null;
}

InputManager.prototype.getWordRangeUnderPoint = function(el, x, y) {
    let t = this.getTextNodeUnderPoint(el, x, y);
    if (t == null)
        return null;

    let r = this.getCharRangeUnderPoint(t, x, y);
    if (r == null)
        return null;

    let s = t.nodeValue, i = r.startOffset, j = r.endOffset;
    if (!this.translator.isArabicChar(s[i]))
        return null;

    while (j < s.length && this.translator.isArabicChar(s[j]))
        j++;
    while (i > 0 && this.translator.isArabicChar(s[(i - 1)]))
        i--;

    r.setStart(t, i); r.setEnd(t, j);
    return r;
}

InputManager.prototype.translateWordUnderPoint = async function(el, x, y) {
    let r = this.getWordRangeUnderPoint(el, x, y);
    if (r == null)
        return;

    this.selectRange(r);
    let transList = this.translator.translateArabicWord(r.toString());
    if (transList.length > 0) {
        this.displayTranslation(el, r, Mode.WORD, TransType.TRANSLIST, transList);
        return;
    }

    transList = this.translateSpacedWord(r);
    if (transList.length > 0) {
        this.displayTranslation(el, r, Mode.WORD, TransType.TRANSLIST, transList);
        return;
    }

    // display someone's name
    let s = r.startContainer.nodeValue, i = r.startOffset, j = r.endOffset;
    if (i > 0 && s[i-1] == "«" && j < s.length-1 && s[j] == "»") {
        let inputWord = r.toString();
        let transWord = await this.translator.gTranslateWord(inputWord);

        this.displayTranslation(el, r, Mode.WORD, TransType.TEXT, transWord);
        return;
    }

    this.displayTranslation(el, r, Mode.WORD, TransType.TEXT, "No Definition Found");
}

InputManager.prototype.translateSpacedWord = function(wordRange) {
    // if arabic word typeset wrongly and has space inside
    let r = wordRange
    let t = r.startContainer
    let s = t.nodeValue, i = r.startOffset, j = r.endOffset;

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

InputManager.prototype.getSentenceRangeUnderPoint = function(el, x, y) {
    let r = document.createRange();

    let t = this.getTextNodeUnderPoint(el, x, y);
    if (t == null) {
        return null;
    }

    r.selectNodeContents(t);

    let s = t.nodeValue, i = 0, j = 0;
    let endPunc = [".", "!", "؟", "؛"]
    while (j < s.length) {
        i = j; j++;
        while (j < s.length && !endPunc.includes(s[j-1]))
            j++;

        r.setStart(t, i); r.setEnd(t, j);
        if (this.withinRange(x, y, r))
            return r;
    }
    return null;
}

InputManager.prototype.translateSentenceUnderPoint = async function(el, x, y) {
    let r = this.getSentenceRangeUnderPoint(el, x, y);
    if (r == null)
        return;

    let s = r.startContainer.nodeValue, i = r.startOffset, j = r.endOffset;
    if (Array.from(s).slice(i,j).every((c) => !this.translator.isArabicChar(c)))
        return;

    this.selectRange(r);
    let inputSentence = r.toString()
    let transSentence = await this.translator.gTranslateSentence(inputSentence);

    this.displayTranslation(el, r, Mode.SENTENCE, TransType.TEXT, transSentence);
}

InputManager.prototype.getPhraseRangeUnderPoint = function(el, x, y) {
    let r = document.createRange();

    let t = this.getTextNodeUnderPoint(el, x, y);
    if (t == null)
        return null;

    r.selectNodeContents(t);

    let s = t.nodeValue, i = 0, j = 0;
    let endPunc = [".", "!", "؟", ":", "،", ",", "—"];
    while (j < s.length) {
        i = j; j++;
        while (j < s.length && !endPunc.includes(s[j-1]))
            j++;

        r.setStart(t, i); r.setEnd(t, j);
        if (this.withinRange(x, y, r))
            return r;
    }
    return null;
}

InputManager.prototype.translatePhraseUnderPoint = async function(el, x, y) {
    let r = this.getPhraseRangeUnderPoint(el, x, y);
    if (r == null)
        return;

    let s = r.startContainer.nodeValue, i = r.startOffset, j = r.endOffset;
    if (Array.from(s).slice(i,j).every((c) => !this.translator.isArabicChar(c)))
        return;

    this.selectRange(r);
    let inputPhrase = r.toString();
    let transPhrase = await this.translator.gTranslatePhrase(inputPhrase);

    this.displayTranslation(el, r, Mode.PHRASE, TransType.TEXT, transPhrase);
}

InputManager.prototype.displayTranslation = function(el, r, mode, transType, transContent) {
    if (mode != this.mode)
        return;

    switch(transType) {
        case TransType.TEXT:
            this.tooltipManager.displayTextTooltip(el, this.selectedRange.getClientRects(), transContent);
            return;
        case TransType.TRANSLIST:
            this.tooltipManager.displayTransListTooltip(el, this.selectedRange.getClientRects(), transContent);
            return;
    }
}

InputManager.prototype.voiceCurrentSelection = async function() {
    if (this.selectedRange == null)
        return;

    let s = this.selectedRange.toString();

    let excludeChars = ["«","»"]
    s = s.replace(new RegExp(excludeChars.join('|'), 'g'), '')

    if (this.mode != Mode.WORD) {
        let harakatUni = this.translator.detransliterate(this.translator.harakat.join(''));
        let phraseEndPunc = [".", "!", "؟", ":", "،", ",", "—"];
        for (let i = 0; i < s.length; i++) {
            if (i == s.length-1 || phraseEndPunc.includes(s[i+1])) {
                if (harakatUni.includes(s[i])) {
                    s = s.slice(0, i) + this.translator.detransliterate('o') + s.slice(i+1)
                }
            }
        }
    }

    await new Promise((resolve) => {
        chrome.runtime.sendMessage({
            contentScriptQuery: "tts",
            text: s,
        }, (response) => {
            resolve(response)
        })
    })
}

let inputManager = new InputManager()
inputManager.initialize();