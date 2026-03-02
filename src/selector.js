import Translator from './translator.js';
import Tooltip from './tooltip.js'

const TransMode = ({
    RAWGTRANSLATE: 0,
    GTRANSLATE: 1,
    GPT: 2
})

const Mode = ({
    WORD: 0,
    PHRASE: 1,
    SENTENCE: 2
})

const TransType = {
    TEXT: 0,
    TRANSLIST: 1
}
function Selector(controller) {
    this.controller = controller;
}

Selector.prototype.init = async function() {
    this.translator = new Translator()
    await this.translator.init()

    this.toolTip = new Tooltip();
}

Selector.prototype.withinRect = function(x, y, rect) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

Selector.prototype.selectRange = function(r) {
    const selection = r.startContainer.ownerDocument.getSelection();
    selection.removeAllRanges();

    r.startContainer.ownerDocument.documentElement.style.setProperty("--selection-bg-color", 'yellow', 'important');
    selection.addRange(r);
    // r.startContainer.parentElement.focus();

    this.selectedRange = r;
}

Selector.prototype.unSelectRange = function() {
    if (this.selectedRange == null)
        return;
    const selection = this.selectedRange.startContainer.ownerDocument.getSelection();
    if (selection)
        selection.removeAllRanges();

    this.selectedRange.startContainer.ownerDocument.documentElement.style.setProperty("--selection-bg-color", '#ACCEF7');
    this.selectedRange = null;
}

Selector.prototype.unSelectTarget = function () {
    this.unSelectRange();
    this.toolTip.hideToolTip();
}

Selector.prototype.currentRange = function() {
    return this.selectedRange;
}

Selector.prototype.currentText = function() {
    return this.selectedRange.toString();
}

Selector.prototype.wordUnderPoint = function(el, x, y) {
    let r = this.getWordRangeUnderPoint(el, x, y);
    if (r == null)
        return null;
    return r.toString();
}

Selector.prototype.sentenceUnderPoint = function(el, x, y) {
    let r = this.getSentenceRangeUnderPoint(el, x, y);
    if (r == null)
        return null;
    return r.toString();
}

Selector.prototype.getTextNodeUnderPoint = function(n, x, y) {
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

Selector.prototype.getCharRangeUnderPoint = function(el, x, y) {
    let t = this.getTextNodeUnderPoint(el, x, y);
    if (t == null)
        return null;

    let r = document.createRange();
    r.selectNodeContents(t);

    let n = r.endOffset;
    for (let i= 0; i < n; i++) {
        r.setStart(r.startContainer, i); r.setEnd(r.startContainer,i+1);
        if (this.withinRect(x, y, r.getBoundingClientRect())) {
            return r;
        }
    }
    return null;
}

Selector.prototype.getWordRangeUnderPoint = function(el, x, y) {
    let r = this.getCharRangeUnderPoint(el, x, y);
    if (r == null)
        return null;

    let s = r.startContainer.nodeValue, i = r.startOffset, j = r.endOffset;
    if (!this.translator.isArabicChar(s[i]))
        return null;

    while (i > 0 && this.translator.isArabicChar(s[(i - 1)]))
        i--;
    while (j < s.length && this.translator.isArabicChar(s[j]))
        j++;

    r.setStart(r.startContainer, i); r.setEnd(r.startContainer, j);
    return r;
}

Selector.prototype.getSentenceRangeUnderPoint = function(el, x, y) {
    let r = this.getCharRangeUnderPoint(el, x, y);
    if (r == null)
        return null;

    let s =  r.startContainer.nodeValue, i = r.startOffset, j = r.endOffset;
    let endPunc = [".", "!", "؟"];

    while (i > 0 && !endPunc.includes(s[i-1]))
        i--;
    while (j < (s.length-1) && !endPunc.includes(s[j]))
        j++;
    j++;

    r.setStart(r.startContainer, i); r.setEnd(r.startContainer, j);

    return r;
}

Selector.prototype.getPhraseRangeUnderPoint = function(el, x, y) {
    let r = this.getCharRangeUnderPoint(el, x, y);
    if (r == null)
        return null;

    let s = r.startContainer.nodeValue, i = r.startOffset, j = r.endOffset;
    let endPunc = [".", "!", "؟", ":", "،", ",", "—","؛"];

    while (i > 0 && !endPunc.includes(s[i-1]))
        i--;
    while (j < s.length && !endPunc.includes(s[j]))
        j++;

    r.setStart(r.startContainer, i); r.setEnd(r.startContainer, j);

    return r;
}

Selector.prototype.getTargetRange = function(el, x, y) {
    switch (this.controller.mode) {
        case Mode.WORD:
            return this.getWordRangeUnderPoint(el, x, y);
        case Mode.PHRASE:
            return this.getPhraseRangeUnderPoint(el, x, y);
        case Mode.SENTENCE:
            return this.getSentenceRangeUnderPoint(el, x, y);
    }
}

Selector.prototype.checkTargetLanguage = function() {
    let s = this.targetRange.toString();
    return s.split("").some((c) => this.translator.isArabicChar(c))
}

Selector.prototype.translateWord = async function(s) {
    let transList = this.translator.translateArabicWord(s);
    if (transList.length > 0)
        return {transType:TransType.TRANSLIST, transContent:transList}


    let transWord = await this.translator.gTranslateWord(s);
    return {transType:TransType.TEXT, transContent: transWord};

    // return {transType:TransType.TEXT, transContent:"No Definition Found"};
}

Selector.prototype.translateTarget = async function() {
    let s = this.targetRange.toString();
    let transContent="";
    let transType;
    switch (this.controller.mode) {
        case Mode.WORD:
            return this.translateWord(s);
            break;
        case Mode.PHRASE:
            transContent = await this.translator.translateArabicPhrase(s);
            transType = TransType.TEXT;
            return {transType:transType, transContent: transContent};
        case Mode.SENTENCE:
            transContent = await this.translator.translateArabicSentence(s);
            transType = TransType.TEXT;
            return {transType:transType, transContent: transContent};
    }
}

Selector.prototype.displayTranslation = function(el, transData) {
    let {transType, transContent} = transData;
    switch(transType) {
        case TransType.TEXT:
            this.toolTip.displayTextTooltip(el, this.selectedRange.getClientRects(), transContent);
            return;
        case TransType.TRANSLIST:
            this.toolTip.displayTransListTooltip(el, this.selectedRange.getClientRects(), transContent);
            return;
    }
}

Selector.prototype.selectTargetAndPopupTranslate = async function(el, x, y) {
    // console.log(`target elem ${el}`);

    this.targetRange = this.getTargetRange(el, x, y);
    if (this.targetRange == null)
        return;

    if (this.checkTargetLanguage() == false)
        return;

    this.selectRange(this.targetRange);

    let transData = await this.translateTarget();

    this.displayTranslation(el, transData);

    // console.log(`Selected Range ${this.selectedRange}`);
}

export default Selector