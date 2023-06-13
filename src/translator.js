import {BuckDict} from "./buckdict.js";

let isNodeJS = typeof window === 'undefined'
if (isNodeJS)
    globalThis.fetch = (await import("node-fetch")).default;

function Translator() {

}

Translator.prototype.init = async function() {
    const buckDictURL = isNodeJS ? './buckdict.js' : chrome.runtime.getURL('./buckdict.js');
    const {BuckDict} = await import(buckDictURL)
    this.buckDict = new BuckDict()
    await this.buckDict.init()
}

Translator.prototype.isArabicChar = function(c) {
    return this.buckDict.isArabicChar(c);
}

Translator.prototype.translateArabicWord = function(uniWord) {
    return this.buckDict.translateArabicWord(uniWord);
}


Translator.prototype.gTranslateText = async function(s) {
    let apiroot = "https://translate.googleapis.com/translate_a/single?"
    let params = {
        client: "gtx",
        sl: "ar",
        tl: "en",
        dt: "t",
        dj: "1",
        tk: "435555.435555",
        q: s
    };
    let paramStr = new URLSearchParams(params);
    let url = apiroot + paramStr;
    const response = await fetch(url, {method: "GET"});
    if (response.status != 200)
        return null;
    let body = await response.json();
    let tlist = body["sentences"].map(s => s["trans"])

    return tlist;
}

Translator.prototype.gTranslateWord = async function(s) {
    let tlist = await this.gTranslateText(s);
    return tlist[0];
}

Translator.prototype.gTranslatePhrase = async function(s) {
    s = s.replace(/\s+/g,' ')

    let excludeChars = ["«","»"]
    s = s.replace(new RegExp(excludeChars.join('|'), 'g'), '')

    let tList = await this.gTranslateText(s);
    return tList[0];
}


Translator.prototype.processTransSentence = function(slist) {
    let transSentence = ""
    for (let i = 0; i < slist.length; i++) {
        slist[i] = slist[i].replace(/\s+$/, " ")

        if (i == 0 || slist[i-1].slice(-2, -1) == '.')
            slist[i] = slist[i][0].toUpperCase() + slist[i].slice(1)
        else
            slist[i] = slist[i][0].toLowerCase() + slist[i].slice(1)

        transSentence += slist[i]
    }
    return transSentence
}

Translator.prototype.gTranslateSentence = async function(s) {
    s = s.replace(/\s+/g,' ')

    let tList = await this.gTranslateText(s);
    let t = this.processTransSentence(tList);

    let arCommas = s.split("،").length -1, ca = 0, cb = 0;
    let midPeriodFound = false;
    let i = 0;
    while (i < t.length) {
        switch (t[i]) {
            case ".":
                if (i != t.length-1 && !(t[i-1] == "." || t[i+1] == ".")) {
                    midPeriodFound = true;
                }
                i++; continue;
            case ",":
                midPeriodFound ? ca++ : cb++;
                if (i <= t.length-5 && t.slice(i, i+5) == ", and") {
                    i += 5; continue;
                }
                i++; continue;
            case "a":
                if (i <= t.length-3 && t.slice(i, i+3) == "and") {
                    midPeriodFound ? ca++ : cb++;
                    i += 3; continue;
                }
                i++; continue;
            default:
                i++;
        }
    }
    if (midPeriodFound) {
        function skipWord(s, i) {
            while (!["،", " "].includes(s[i]) && i < s.length)
                i++;
            return i;
        }

        let breakIndexes = [];
        let i = 0;
        while (i < s.length) {
            switch(s[i]) {
                case " ":
                    i++; continue;
                case "،":
                    i++; breakIndexes.push(i);
                    if (s.slice(i, i+2) == " و") {
                        i += 2;
                        i = skipWord(s, i);
                    }
                    continue;
                case "و":
                    breakIndexes.push(i); 
                    i = skipWord(s, i); continue;
                default:
                    i = skipWord(s, i); continue;
            }
        }

        let chunks = [];
        for (let i = 0; i < breakIndexes.length; i++) {
            if (i == 0) {
                chunks.push(s.slice(0, breakIndexes[0]))
            } else {
                chunks.push(s.slice(breakIndexes[i-1], breakIndexes[i]));
            }
        }
        chunks.push(s.slice(breakIndexes[breakIndexes.length-1]));
        chunks = chunks.map(c => c.trim());

        i = 0; let longChunk = false
        while (i < ca+1 || longChunk == false || chunks[chunks.length-1-i].slice(-1) != "،") {
            let c = chunks[chunks.length-1-i];
            if (c.split(" ").length > 3)
                longChunk = true;
            i++;
        }

        let s1 = chunks.slice(0, chunks.length-i).join(" ");
        let s2 = chunks.slice(chunks.length-i).join(" ");

        let modS = s1 + "\n" + s2;

        let excludeChars = ["«","»"];
        modS = modS.replace(new RegExp(excludeChars.join('|'), 'g'), '');

        tList = await this.gTranslateText(modS);
        t = this.processTransSentence(tList);
        return t;
    }

    let colonNum = 0; let breakColonFound = false;
    for (let i = 0; i < t.length; i++) {
        if (t[i] == ":") {
            colonNum++;
            if (i < t.length-2 && t[i+2] == t[i+2].toUpperCase()) {
                breakColonFound = true;
                break;
            }
        }
    }
    if (breakColonFound) {
        let breakColonIndex = s.split(":", colonNum).join(":").length;

        let modS = s.slice(0, breakColonIndex+1) + "\n" + s.slice(breakColonIndex+1);

        let excludeChars = ["«","»"];
        modS = modS.replace(new RegExp(excludeChars.join('|'), 'g'), '');

        tList = await this.gTranslateText(modS);
        t = this.processTransSentence(tList)
        return t;
    }

    return t;
}

export {Translator}