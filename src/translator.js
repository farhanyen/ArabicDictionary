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

    this.harakat = this.buckDict.harakat
    this.transliterate = this.buckDict.transliterate.bind(this.buckDict)
    this.detransliterate = this.buckDict.detransliterate.bind(this.buckDict)

    const scannerURL = isNodeJS ? './scanner.js' : chrome.runtime.getURL('./scanner.js');
    const {Scanner} = await import(scannerURL)
    this.scanner = Scanner
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


Translator.prototype.concatGTransList = function(slist) {
    slist = slist.map((s) => s.trim());

    for (let i = 1; i < slist.length; i++) {
        if (slist[i][0] == slist[i][0].toLowerCase())
            slist[i-1] = slist[i-1].slice(0, -1) + ","
        else
            slist[i-1] = slist[i-1].slice(0, -1) + "."
    }

    
    return slist.join(" ");
}

Translator.prototype.gTranslateSentence = async function(s) {
    s = s.replace(/\s+/g,' ').trim()
    let ar_end_clause = ["،", ":"]
    s = s.replace(new RegExp(`([${ar_end_clause.join('')}])([^ ])`, 'g'), "$1 $2")


    let s1 = s.replace(/«|»/g, ''), s2 = s;
    let [tList1, tList2] = await Promise.all([
        this.gTranslateText(s1),
        this.gTranslateText(s2)
    ])

    let t1 = this.concatGTransList(tList1);
    let pt1 = new this.scanner(t1, false);
    pt1.scanChunks();
    
    let t2 = this.concatGTransList(tList2);
    let pt2 = new this.scanner(t2, false);
    pt2.scanChunks();

    if (pt1.firstMidPeriodChunk != -1) {
        return this.spliceRetryTranslateSentence(s1, pt1);
    } else if (pt2.firstMidPeriodChunk != -1) {
        return this.spliceRetryTranslateSentence(s2, pt2);
    }

    let t = t1;

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

        modS = modS.replace(/«|»/g, '')

        let tList = await this.gTranslateText(modS);
        let t = this.concatGTransList(tList)
        return t;
    }

    return t;
}

Translator.prototype.spliceRetryTranslateSentence = async function (s, transParser) {
    let pt = transParser;

    let pa = new this.scanner(s, true);
    pa.scanChunks();
    let chunks = pa.chunks;

    let breakChunkFromLast = pa.chunks.length - pt.firstMidPeriodChunk;
    if (pt.chunks[pt.firstMidPeriodChunk].slice(-1) == "." && pt.chunks.length == pa.chunks.length && pt.firstMidPeriodChunk < pt.chunks.length-1)
        breakChunkFromLast--;

    function lastNChunkstoLongChunk(chunks, n) {
        let longChunk = false; let chunkLen = 0;
        for (let i = 1; i < chunks.length; i++) {
            let chunk = chunks[chunks.length-i];
            if (chunk.slice(-1) == "،")
                chunkLen = 0;
            chunkLen += chunk.split(" ").length;
            if (chunkLen > 3)
                longChunk = true;

            if (i >= n && longChunk && chunks[chunks.length-i-1].slice(-1) == "،")
                return i;
        }
        return n;
    }
    let i = lastNChunkstoLongChunk(chunks, breakChunkFromLast);

    let s1 = chunks.slice(0, chunks.length-i).join(" ");
    let s2 = chunks.slice(chunks.length-i).join(" ");

    s1 = s1.slice(0, -1) + ".";
    let modS = s1 + "\n" + s2;
    modS = modS.replace(/«|»/g, '')

    let tList = await this.gTranslateText(modS);
    let t = this.concatGTransList(tList);
    return t;
}

export {Translator}