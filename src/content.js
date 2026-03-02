import Translator from './translator.js';
import Anki from './anki.js';
import VideoSubtitle from './subtitle/subtitle.js'
import Tooltip from './tooltip.js'
import Selector from './selector.js'

// if (typeof browser == "undefined") {
    // browser = chrome
// }

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
function InputManager() {
}

InputManager.prototype.init = async function() {
    console.log("Start Import")
    console.log("contentscript test")

    this.mode = Mode.WORD

    this.translator = new Translator()
    await this.translator.init()

    this.selector = new Selector(this)
    await this.selector.init()

    this.anki = new Anki(this)
    await this.anki.init()

    if (location.href.includes("youtube")) {
        console.log("Init VidSub")
        this.vidSub = new VideoSubtitle(location.href);
        const observer = new MutationObserver((mutations, obs) => {
            const videoElement = document.querySelector('video');
            if (videoElement) {
                this.vidSub.init();
                obs.disconnect(); // Stop observing if no longer needed
            }
        });

        observer.observe(document, { childList: true, subtree: true });
    }
    
    this.toolTip = new Tooltip();

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
    if (this.selector.currentRange() && this.withinRange(x, y, this.selector.currentRange()))
        return;

    if (this.selector.currentRange() && !this.withinRange(x, y, this.selector.currentRange()))
        this.selector.unSelectTarget();

    clearTimeout(this.mouseStillTimeout);
    if (!(e.buttons & 1))
        this.mouseStillTimeout = setTimeout(this.onMouseStill.bind(this), 100, e);
}

InputManager.prototype.onMouseStill = function(e) {
    this.selector.selectTargetAndPopupTranslate(e.target, e.clientX, e.clientY);
}

InputManager.prototype.onKeyDown = async function(e)  {
    if (e.metaKey || e.repeat)
        return;

    let m_e = this.lastMouseMoveEvent;
    switch (e.key) {
        case 'a':
            let curWord = this.selector.wordUnderPoint(m_e.target, m_e.clientX, m_e.clientY)
            let curSentence = this.selector.sentenceUnderPoint(m_e.target, m_e.clientX, m_e.clientY)

            await this.anki.addNote(curWord, curSentence);
            this.toolTip.appendHTML("<p>Anki Card Created!</p>")
            break;
        case 'y': {
            let curWord = this.selector.wordUnderPoint(m_e.target, m_e.clientX, m_e.clientY)
            let curSentence = this.selector.sentenceUnderPoint(m_e.target, m_e.clientX, m_e.clientY)

            let video = document.querySelector(".video-stream");
            let canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            let ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            let imageURL = canvas.toDataURL('image/png');
            imageURL = imageURL.slice(22);
            await this.anki.addNote(curWord, curSentence, imageURL);
            this.toolTip.appendHTML("<p>Anki Card Created!</p>")

            // let title = document.querySelector("h1.style-scope.ytd-watch-metadata");
            // let virtualLink = document.createElement("a");
            // virtualLink.href = imageURL;
            // virtualLink.download = `${title}`;
            // virtualLink.click();
            // virtualLink.remove();
        }
        case 'w':
            if (this.mode == Mode.WORD)
                return;
            else
                this.mode = Mode.WORD;

            this.selector.unSelectTarget();
            this.selector.selectTargetAndPopupTranslate(m_e.target, m_e.clientX, m_e.clientY);
            break;
        case 'c':
            if (this.mode == Mode.PHRASE)
                this.mode = Mode.WORD;
            else
                this.mode = Mode.PHRASE;

            this.selector.unSelectTarget();
            this.selector.selectTargetAndPopupTranslate(m_e.target, m_e.clientX, m_e.clientY);
            break;
        case 's':
            if (this.mode == Mode.SENTENCE)
                this.mode = Mode.WORD;
            else
                this.mode = Mode.SENTENCE;

            this.selector.unSelectTarget();
            this.selector.selectTargetAndPopupTranslate(m_e.target, m_e.clientX, m_e.clientY);
            break;
        case 'g': {
            if (this.mode != Mode.WORD)
                return;

            let el = m_e.target;
            let x = m_e.x;
            let y = m_e.y;
            this.targetRange = this.selector.getTargetRange(el, x, y);
            if (this.targetRange == null)
                return;

            if (this.selector.checkTargetLanguage() == false)
                return;

            // this.selectRange(this.targetRange);
            let s = this.selector.targetRange.toString();
            let transWord = await this.translator.gTranslateWord(s);
            let transData = {transType:TransType.TEXT, transContent: transWord};

            this.selector.displayTranslation(el, transData);
            break;
        }
        case 'v':
            this.voiceCurrentSelection();
            break;
        case 'b': {
            this.voiceCurrentSelectionAzure();
            break;
        }
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

InputManager.prototype.voiceCurrentSelection = async function() {
    if (this.selector.currentRange() == null)
        return;

    let s = this.selector.currentText();

    let excludeChars = ["«","»","\""]
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

    console.log('sending\n');
    await new Promise((resolve) => {
        chrome.runtime.sendMessage({
            contentScriptQuery: "tts",
            text: s,
        }, (response) => {
            resolve(response)
        })
    })
}

InputManager.prototype.voiceCurrentSelectionAzure = async function() {
    if (this.selector.currentRange() == null)
        return;

    let s = this.selector.currentText();

    let excludeChars = ["«","»","\""]
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

    console.log('sending\n');
    await new Promise((resolve) => {
        chrome.runtime.sendMessage({
            contentScriptQuery: "tts_azure",
            text: s,
        }, (response) => {
            resolve(response)
        })
    })
}

let inputManager = new InputManager()
inputManager.init();

function printSelectedText()  {
    let text = window.getSelection().toString()
    console.log(`Selected Text: ${text}`)
}

// setInterval(printSelectedText, 1000);