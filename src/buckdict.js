let isNodeJS = typeof window === 'undefined'
if (isNodeJS)
    globalThis.fetch = (await import("node-fetch")).default;
async function readLocalFile(fp) {
    const fs = await import('fs')

    const path = await import('path')
    const {fileURLToPath} = await import('url')
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)

    const data = await fs.promises.readFile(path.resolve(__dirname, fp), { encoding: 'utf8' })
    return data
}

async function readExtensionFile(fp) {
    const url = chrome.runtime.getURL(fp)
    const response = await fetch(url)
    const text = await response.text()
    return text
}

async function readFile(fp) {
    if (typeof window === 'undefined') {
        return readLocalFile(fp)
    } else {
        return readExtensionFile(fp)
    }
}

function MorphTable(fp) {
    this.filePath = fp
}

MorphTable.prototype.init = async function() {
    const text = await readFile(this.filePath)
    const lines = text.split("\n")
    for (let line of lines) {
        if (line.startsWith(";")) {
            continue
        }
        line = line.trim()
        const fields = line.split(" ")

        this.addEntry(fields[0], fields[1])
    }
}

MorphTable.prototype.contains = function(key) {
    return this.hasOwnProperty(key)
}

MorphTable.prototype.get = function(key) {
    if (!this.contains(key)) {
        return null
    }
    return this.key
}

MorphTable.prototype.addEntry = function(key, value) {
    if (!this.contains(key)) {
        this[key] = []
    }
    this[key].push(value)
}

function DictTable(fp) {
    this.filePath = fp
}

DictTable.prototype.init = async function() {
    const text = await readFile(this.filePath)
    const lines = text.split("\n")
    let root
    for (let line of lines) {
        line = line.slice(0, -1) // remove carriage return
        if (line == "")
            continue
        if (line.startsWith(";")) {
            if (line.startsWith(";--- "))
                root = line.split(" ")[1]
            continue
        }

        const fields = line.split("\t")
        const key = fields[0]
        const entry = {
            harakat: fields[1],
            morph: fields[2],
            def: fields[3].split(/\[|</)[0].trim(),
            root: root
        }
        this.addEntry(key, entry)
    }
}

DictTable.prototype.contains = function(key) {
    return this.hasOwnProperty(key)
}

DictTable.prototype.addEntry = function(key, value) {
    if (!this.contains(key)) {
        this[key] = []
    }
    this[key].push(value)
}

function BuckDict() {
}

BuckDict.prototype.init = async function() {
    // const utilsURL = isNodeJS ? './utils.js' : chrome.runtime.getURL('./utils.js');
    // const {Utils} = await import(utilsURL)
    // this.utils = new Utils()

    this.initBuck()
    await this.loadDictData()
}

BuckDict.prototype.initBuck = function() {
    this.buck2uni = {
        "'": "\u0621",
        "|": "\u0622",
        ">": "\u0623",
        "&": "\u0624",
        "<": "\u0625",
        "}": "\u0626",
        "A": "\u0627",
        "b": "\u0628",
        "p": "\u0629",
        "t": "\u062A",
        "v": "\u062B",
        "j": "\u062C",
        "H": "\u062D",
        "x": "\u062E",
        "d": "\u062F",
        "*": "\u0630",
        "r": "\u0631",
        "z": "\u0632",
        "s": "\u0633",
        "$": "\u0634",
        "S": "\u0635",
        "D": "\u0636",
        "T": "\u0637",
        "Z": "\u0638",
        "E": "\u0639",
        "g": "\u063A",
        "_": "\u0640",
        "f": "\u0641",
        "q": "\u0642",
        "k": "\u0643",
        "l": "\u0644",
        "m": "\u0645",
        "n": "\u0646",
        "h": "\u0647",
        "w": "\u0648",
        "Y": "\u0649",
        "y": "\u064A",
        "F": "\u064B",
        "N": "\u064C",
        "K": "\u064D",
        "a": "\u064E",
        "u": "\u064F",
        "i": "\u0650",
        "~": "\u0651",
        "o": "\u0652",
        "`": "\u0670",
        "{": "\u0671",
        "P": "\u067E",
        "J": "\u0686",
        "V": "\u06A4",
        "G": "\u06AF"
    }
    this.uni2buck = {}
    for (const key in this.buck2uni) {
        this.uni2buck[this.buck2uni[key]] = key
    }

    this.harakat = ['F','N','K','a','u','i','~','o','`']

    this.stripMods = {
        '|': 'A',
        '>': 'A',
        '<': 'A',
        '{': 'A',
        '&': 'w',
        'Y': 'y',
        'p': 'h'
    }
}

BuckDict.prototype.loadDictData = async function() {
    this.tableab = new MorphTable("./data/tableab")
    this.tableac = new MorphTable("./data/tableac")
    this.tablebc = new MorphTable("./data/tablebc")
    this.dictPref = new DictTable("./data/dictprefixes")
    this.dictStem = new DictTable("./data/dictstems")
    this.dictSuff = new DictTable("./data/dictsuffixes")

    await Promise.all([this.tableab.init(), this.tablebc.init(), this.tableac.init(), this.dictPref.init(), this.dictStem.init(), this.dictSuff.init()])
}

BuckDict.prototype.checkMorph = function(prefEntry, stemEntry, suffEntry) {
    const a = prefEntry.morph
    const b = stemEntry.morph
    const c = suffEntry.morph

    return (this.tableab[a].includes(b) && this.tablebc[b].includes(c) && this.tableac[a].includes(c))
}

BuckDict.prototype.getSegmentsTransList = function(pref, stem, suff) {
    const transList = []
    for (const prefEntry of this.dictPref[pref]) {
        for (const stemEntry of this.dictStem[stem]) {
            for(const suffEntry of this.dictSuff[suff]) {
                if (!this.checkMorph(prefEntry, stemEntry, suffEntry))
                    continue

                const trans = {
                    word: prefEntry.harakat + stemEntry.harakat + suffEntry.harakat,
                    // prefEntry: prefEntry,
                    // stemEntry: stemEntry,
                    // suffEntry: suffEntry,
                    prefSet: prefEntry.def ? prefEntry.def.split("/"): [],
                    stemDef: stemEntry.def,
                    suffSet: suffEntry.def ? suffEntry.def.split("/"): [],
                    root: stemEntry.root
                }
                transList.push(trans)
            }
        }
    }
    return transList
}

BuckDict.prototype.getTransList = function(buckWord) {
    const transList = []
    for (let i = 0; i <= buckWord.length; i++) {
        for (let j = i; j <= buckWord.length; j++) {
            let pref = buckWord.slice(0, i)
            let stem = buckWord.slice(i, j)
            let suff = buckWord.slice(j, buckWord.length)

            if (!this.dictPref.contains(pref) || !this.dictStem.contains(stem) || !this.dictSuff.contains(suff))
                continue

            const segTransList = this.getSegmentsTransList(pref, stem, suff)
            transList.push(...segTransList)
        }
    }
    return transList
}

BuckDict.prototype.removeHarakat = function(buckWord) {
    return buckWord.replace(new RegExp(this.harakat.join('|'), 'g'), '')
}

BuckDict.prototype.transListRemoveHarakatConflicts = function(transList, buckWord) {
    let litWord = this.stripHarakat(buckWord)
    let newList = [];
    for (let trans of transList) {
        if (this.matchWord(trans.word, litWord))
            newList.push(trans)
    }
    if (newList.length > 0)
        return newList
    return transList
}

BuckDict.prototype.stripHarakat = function(buckWord) {
    const h_chars = this.harakat.join('')
    const re = new RegExp(`^[${h_chars}]*|[${h_chars}]*$`)
    return buckWord.replace(re, '')
}

BuckDict.prototype.matchWord = function(w1, w2) {
    w1 = this.removeLetterMods(w1), w2 = this.removeLetterMods(w2)
    let ls1 = this.getLetters(w1), ls2 = this.getLetters(w2);
    if (ls1.length != ls2.length) {
        console.log("Different no of letters:", ls1, ls2);
        return false;
    }

    for (let i = 0; i < ls1.length-1; i++) {
        if (!this.compareLetters(ls1[i], ls2[i])) {
            return false;
        }
    }
    return true;
}

BuckDict.prototype.removeLetterMods = function(buckWord) {
    function replacer(match, p1, offset, string) {
        return this.stripMods[p1];
    }
    return buckWord.replace(/(\||>|<|\{|&|Y|p)/g, replacer.bind(this))
}

BuckDict.prototype.getLetters = function(w) {
    let s = 0, i = 0;
    let letters = [];
    while (i < w.length) {
        s = i; i++;
        while (this.harakat.includes(w[i])) {
            i++;
        }
        letters.push(w.slice(s, i));
    }
    return letters;
}

BuckDict.prototype.compareLetters = function(l1, l2) {
    let sub1 = l1.split('').every(c => l2.includes(c))
    let sub2 = l2.split('').every(c => l1.includes(c))

    return sub1 || sub2;
}

BuckDict.prototype.transListMergeDuplicate = function (transList) {
    let tl = transList;
    for (let i = 0; i < tl.length; i++) {
        for (let j = 0; j < tl.length; j++) {
            if (tl[i].word != tl[j].word || tl[i].stemDef != tl[j].stemDef ||
                tl[i].root != tl[j].root)
                continue;

            if (tl[i].prefSet.sort().join() != tl[j].prefSet.sort().join() &&
                tl[i].suffSet.sort().join() == tl[j].suffSet.sort().join()) {
                tl[i].prefSet = Array.from(new Set([...tl[i].prefSet, ...tl[j].prefSet]));
                tl.splice(j, 1);
                return true;
            }

            if (tl[i].suffSet.sort().join() != tl[j].suffSet.sort().join() &&
                tl[i].prefSet.sort().join() == tl[j].prefSet.sort().join()){
                tl[i].suffSet = Array.from(new Set([...tl[i].suffSet, ...tl[j].suffSet]));
                tl.splice(j, 1);
                return true;
            }
        }
    }
    return false;
}

BuckDict.prototype.transListMergeDuplicates = function (transList) {
    while (this.transListMergeDuplicate(transList)) {};
    return transList;
}

BuckDict.prototype.translateBuckWord = function (buckWord) {
    let tl = this.getTransList(this.removeHarakat(buckWord));
    tl = this.transListRemoveHarakatConflicts(tl, buckWord);
    tl = this.transListMergeDuplicates(tl);

    for (let t of tl) {
        t.def = (t.prefSet.length > 0 ? `[${t.prefSet.join('/')}] `:'') + t.stemDef + (t.suffSet.length > 0 ? ` [${t.suffSet.join('/')}]`:'');
    }
    return tl;
}

BuckDict.prototype.transliterate = function(uniWord) {
    return uniWord.replace(new RegExp(Object.keys(this.uni2buck).join('|'), 'g'), (c) => this.uni2buck[c])
}

BuckDict.prototype.detransliterate = function(buckWord) {
    const buck = Object.keys(this.buck2uni).map(s => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
    return buckWord.replace(new RegExp(buck.join('|'), 'g'), (c) => this.buck2uni[c])
}

BuckDict.prototype.detransliterateTransList = function(transList) {
    for (let trans of transList) {
        trans.word = this.detransliterate(trans.word)
        trans.root = this.detransliterate(trans.root)
    }
}

BuckDict.prototype.translateUniWord = function(uniWord) {
    let buckWord = this.transliterate(uniWord);
    let transList = this.translateBuckWord(buckWord);

    this.detransliterateTransList(transList);
    return transList
}

BuckDict.prototype.isArabicChar = function(c) {
    return c in this.uni2buck;
}

BuckDict.prototype.translateArabicWord = function(uniWord) {
    // uniWord = this.stripNonArabic(uniWord)
    uniWord = uniWord.replace(/ /g, "");
    let isArabic = uniWord.split('').every(c => Object.keys(this.uni2buck).includes(c))
    if (!isArabic) {
        throw new Error("Attempt translate non-arabic word")
    }
    return this.translateUniWord(uniWord)
}

export {BuckDict}


BuckDict.prototype.buckStrip = function(buckWord) {
    buckWord = this.removeLetterMods(buckWord)
    return this.removeHarakat(buckWord)
}

const exceptions = [
    "|nA'}",
    "bay~umiy~",
    "mAjAhiyr",
    "jahowA'",
    "ra&uwf",
    "ra&uwf",
    "salomawiy~",
    "guwAyAnA",
    "faroHAt",
    "na$A$iybiy~"
]

// import assert from 'assert';
// for (const key in this.dictStem) {
//     if (key == "fp" || typeof this.dictStem[key] === 'function')
//         continue;
//
//     for (const stemEntry of this.dictStem[key]) {
//         if (exceptions.includes(stemEntry.harakat))
//             continue;
//         if(!(this.matchWord(key, stemEntry.harakat))) {
//             console.log(key, stemEntry.harakat);
//             assert(1==0);
//         }
//         if (!(this.removeLetterMods(key) == this.buckStrip(stemEntry.harakat))) {
//             console.log(key, stemEntry.harakat, this.removeLetterMods(key), this.buckStrip(stemEntry.harakat));
//             assert(1==0);
//         }
//     }
// }