import BuckDict from './buckdict.js';
import Scanner from './scanner.js';
import Gpt from './gpt.js';

// let isNodeJS = typeof window === 'undefined'
// if (isNodeJS) {
//     globalThis.fetch = (await import("node-fetch")).default;
//     globalThis.Headers = (await import("node-fetch")).Headers;
// }

const TransMode = ({
    RAWGTRANSLATE: 0,
    GTRANSLATE: 1,
    GPT: 2
})
function Translator() {
}

Translator.prototype.init = async function() {
    this.buckDict = new BuckDict()
    await this.buckDict.init()

    this.harakat = this.buckDict.harakat
    this.transliterate = this.buckDict.transliterate.bind(this.buckDict)
    this.detransliterate = this.buckDict.detransliterate.bind(this.buckDict)

    this.gpt = new Gpt();

    this.transMode = TransMode.GTRANSLATE;
}

Translator.prototype.isArabicChar = function(c) {
    return this.buckDict.isArabicChar(c);
}

Translator.prototype.translateArabicWord = function(uniWord) {
    return this.buckDict.translateArabicWord(uniWord);
}

Translator.prototype.gTranslateRaw = async function(s) {
    s = s.replace(/[\n\t]/g, "");
    s = s.replace(/ +/g, " ").trim();

    let tList = await this.gTranslateText(s);

    return tList.join("");
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
    let tlist = body["sentences"].map(s => s["trans"]);

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
    let t2 = this.concatGTransList(tList2);

    let pt1 = new Scanner(t1, false);
    pt1.scanChunks();
    let pt2 = new Scanner(t2, false);
    pt2.scanChunks();

    if (pt1.firstMidPeriodChunk != -1) {
        return this.spliceAtPeriodThenReTranslate(s1, pt1);
    } else if (pt2.firstMidPeriodChunk != -1) {
        return this.spliceAtPeriodThenReTranslate(s2, pt2);
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

Translator.prototype.spliceClausesThenReTranslate = async function(s) {
    let clauses = s.split("،");
    clauses = clauses.map(c => c+"،");
    clauses[clauses.length-1] = clauses[clauses.length-1].slice(0, -1)

    let longClauses = []; let clause = "";
    for (let i = 0; i < clauses.length-1; i++) {
        clause += clauses[i];
        if (clauses[i+1].split(" ").length > 3) {
            longClauses.push(clause);
            clause = "";
        }
    }
    clause += clauses[clauses.length-1];
    longClauses.push(clause);

    let modS = longClauses.join(". ");
    let tList = await this.gTranslateText(modS);
    let newT = this.concatGTransList(tList);
    return newT;
}

Translator.prototype.spliceAtPeriodThenReTranslate = async function (s, pt) {
    let breakChunk = pt.firstMidPeriodChunk;
    if (pt.chunks[pt.firstMidPeriodChunk].slice(-1) == "." && pt.firstMidPeriodChunk < pt.chunks.length-1)
        breakChunk++;

    let pa = new Scanner(s, true);
    pa.scanChunks();

    let arClauses = []; let clauseChunks = []; let breakClause = -1;
    for (let i = 0; i < pa.chunks.length; i++) {
        clauseChunks.push(pa.chunks[i]);
        if (pa.chunks[i].slice(-1) == "،" || i == pa.chunks.length - 1) {
            arClauses.push(clauseChunks.join(" "));
            clauseChunks = [];
            if (breakClause == -1 && i >= breakChunk) {
                breakClause = arClauses.length-1;
            }
        }
    }

    let lastLongClause;
    for (let i = arClauses.length-1; i >= 0; i--) {
        if (arClauses[i].split(" ".length > 3)) {
            lastLongClause = i;
            break;
        }
    }

    breakClause = Math.min(breakClause, lastLongClause);

    let s1 = arClauses.slice(0, breakClause).join(" ");
    let s2 = arClauses.slice(breakClause).join(" ");

    s1 = s1.slice(0, -1) + ".";
    let modS = s1 + "\n" + s2;

    let tList = await this.gTranslateText(modS);
    let newT = this.concatGTransList(tList);
    return newT;
}

Translator.prototype.translateArabicSentence = async function(s) {
    switch (this.transMode) {
        case TransMode.RAWGTRANSLATE:
            return await this.gTranslateRaw(s);
            break;
        case TransMode.GTRANSLATE:
            return await this.gTranslateSentence(s);
            break;
        // case TransMode.GPT:
        //     return await this.gpt.translateSentenceInElement(s, el);
        //     break;
    }
}

Translator.prototype.translateArabicPhrase = async function(s) {
    return await this.gTranslatePhrase(s);
    // return await this.gptTranslateText(s);
}

export default Translator