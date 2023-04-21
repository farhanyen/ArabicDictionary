
function printFilePath(path) {
    //console.log("get translation from: ", path)
}

async function readLocalFile(path) {
    const fs = (await import('fs')).promises
    try {
        const data = await fs.readFile(path, { encoding: 'utf8' })
        return data
    } catch (err){
        //console.log(err)
    }
}

async function readExtensionFile(path) {
    const url = chrome.runtime.getURL(path)
    const response = await fetch(url)
    const text = await response.text()
    return text
}

async function readFile(path) {
    if (typeof window === 'undefined') {
        return readLocalFile(path)
    } else {
        return readExtensionFile(path)
    }
}

// const ab = await readFile("./data/tableab")
// const dictPref = await readFile("./data/dictprefixes")
// const dictStem = await readFile("./data/dictstems")
// console.log(dictPref)
// console.log(dictStem)

function MorphTable(path) {
    this.path = path
}

MorphTable.prototype.init = async function() {
    const text = await readFile(this.path)
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

function Dict(path) {
    this.path = path
}

Dict.prototype.init = async function() {
    const text = await readFile(this.path)
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
            diacritics: fields[1],
            morph: fields[2],
            def: fields[3].split(/\[|</)[0].trim(),
            root: root
        }
        this.addEntry(key, entry)
    }
}

Dict.prototype.contains = function(key) {
    return this.hasOwnProperty(key)
}

Dict.prototype.addEntry = function(key, value) {
    if (!this.contains(key)) {
        this[key] = []
    }
    this[key].push(value)
}

let tableab, tablebc, tableac
let dictPref, dictStem, dictSuff
async function loadDictData() {
    tableab = new MorphTable("./data/tableab")
    tableac = new MorphTable("./data/tableac")
    tablebc = new MorphTable("./data/tablebc")
    dictPref = new Dict("./data/dictprefixes")
    dictStem = new Dict("./data/dictstems")
    dictSuff = new Dict("./data/dictsuffixes")

    await Promise.all([tableab.init(), tablebc.init(), tableac.init(), dictPref.init(), dictStem.init(), dictSuff.init()])
}

await loadDictData()

function translateWord(word) {
    const transList = []
    for (let i = 0; i <= word.length; i++) {
        for (let j = i; j <= word.length; j++) {
            let pref = word.slice(0, i)
            let stem = word.slice(i, j)
            let suff = word.slice(j, word.length)

            if (!dictPref.contains(pref) || !dictStem.contains(stem) || !dictSuff.contains(suff))
                continue

            const componentTransList = translateComponents(pref, stem, suff)
            transList.push(...componentTransList)
        }
    }
    return transList
}

function translateComponents(pref, stem, suff) {
    const transList = []
    for (const prefEntry of dictPref[pref]) {
        for (const stemEntry of dictStem[stem]) {
            for(const suffEntry of dictSuff[suff]) {
                if (!checkMorph(prefEntry, stemEntry, suffEntry))
                    continue

                const trans = {
                    word: prefEntry.diacritics+stemEntry.diacritics+suffEntry.diacritics,
                    def: (prefEntry.def ?`[${prefEntry.def}] `:"") + stemEntry.def + (suffEntry.def ?` [${suffEntry.def}]`:""),
                    root: stemEntry.root
                }
                // console.log(trans)
                transList.push(trans)
            }
        }
    }
    return transList
}
function checkMorph(prefEntry, stemEntry, suffEntry) {
    const a = prefEntry.morph
    const b = stemEntry.morph
    const c = suffEntry.morph

    return (tableab[a].includes(b) && tablebc[b].includes(c) && tableac[a].includes(c))
}

const harakat = ['F','N','K','a','u','i','~','o','`']

function removeHarakat(word) {
    return word.replace(new RegExp(harakat.join('|'), 'g'), '')
}

function buckStrip(buckWord) {
    buckWord = removeLetterMods(buckWord)
    return removeHarakat(buckWord)
}


// translateWord("wAlgAz")
// translateWord(removeHarakat('wa>alogAz'))

let buck2uni = {
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
let uni2buck = {}
for (const key in buck2uni) {
    uni2buck[buck2uni[key]] = key
}

function isArabicChar(c) {
    return c in uni2buck;
}

function transliterate(uniWord) {
    return uniWord.replace(new RegExp(Object.keys(uni2buck).join('|'), 'g'), (c) => uni2buck[c])
}

function detransliterate(word) {
    const buck = Object.keys(buck2uni).map(s => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
    return word.replace(new RegExp(buck.join('|'), 'g'), (c) => buck2uni[c])
}

function detransliterateTransList(transList) {
    for (let trans of transList) {
        trans.word = detransliterate(trans.word)
        trans.root = detransliterate(trans.root)
    }
}
function translateRawWord(uniWord) {
    let buckWord = transliterate(uniWord)
    buckWord = stripHarakat(buckWord)
    let transList = translateWord(removeHarakat(buckWord))
    // console.log(transList)
    transList = removeConflictingTrans(transList, buckWord)
    detransliterateTransList(transList)
    return transList
}

function removeConflictingTrans(transList, litWord) {
    let newList = [];
    for (let trans of transList) {
        if (matchWord(trans.word, litWord))
            newList.push(trans)
    }
    if (newList.length > 0)
        return newList
    return transList
}

function matchWord(w1, w2) {
    w1 = removeLetterMods(w1), w2 = removeLetterMods(w2)
    let ls1 = getLetters(w1), ls2 = getLetters(w2);
    if (ls1.length != ls2.length) {
        console.log("Different no of letters:", ls1, ls2);
        return false;
    }

    for (let i = 0; i < ls1.length-1; i++) {
        if (!compareLetters(ls1[i], ls2[i])) {
            return false;
        }
    }
    return true;
}

let stripMods = {
    '|':'A',
    '>': 'A',
    '<': 'A',
    '{': 'A',
    '&': 'w',
    'Y': 'y',
    'p': 'h'
}
function removeLetterMods(buckWord) {
    function replacer(match, p1, offset, string) {
        return stripMods[p1];
    }
    return buckWord.replace(/(\||>|<|\{|&|Y|p)/g, replacer)
}

function getLetters(w) {
    let s = 0, i = 0;
    let letters = [];
    while (i < w.length) {
        s = i; i++;
        while (harakat.includes(w[i])) {
            i++;
        }
        letters.push(w.slice(s, i));
    }
    return letters;
}

function compareLetters (l1, l2) {
    let sub1 = l1.split('').every(c => l2.includes(c))
    let sub2 = l2.split('').every(c => l1.includes(c))

    return sub1 || sub2;
}


// let tWord1 = "رَبُّهُ"
// let tWord2 = "رَبُّهُۥ"
//
// console.log(transliterate(tWord1))
// console.log(translateWordIfArabic(tWord1))
//
// console.log(transliterate(tWord2))
// console.log(translateWordIfArabic(tWord2))

// let tWord3 = "نَحْوَها"
// console.log(transliterate(tWord3))
// console.log(translateWordIfArabic(tWord3))


// let tWord4 = " ْتَجِد"
// console.log(transliterate(tWord4))
// // console.log(translateWordIfArabic(tWord4))
// console.log(stripHarakat(transliterate(stripNonArabic(tWord4))))
// console.log(translateWordIfArabic(tWord4))

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
// for (const key in dictStem) {
//     if (key == "path" || typeof dictStem[key] === 'function')
//         continue;
//
//     for (const stemEntry of dictStem[key]) {
//         if (exceptions.includes(stemEntry.diacritics))
//             continue;
//         if(!(matchWord(key, stemEntry.diacritics))) {
//             console.log(key, stemEntry.diacritics);
//             assert(1==0);
//         }
//         if (!(removeLetterMods(key) == buckStrip(stemEntry.diacritics))) {
//             console.log(key, stemEntry.diacritics, removeLetterMods(key), buckStrip(stemEntry.diacritics));
//             assert(1==0);
//         }
//     }
// }

function removePunctuation(word) {
    const ar_punc = '\u060C\u060D\u060E\u060F\u061B\u061E\u061F'
    const en_punc = '»«:;.!\'"-_`~\\s\\[\\]\\{\\}\\^\\$\\*\\+'
    const punc = `${ar_punc}${en_punc}`
    const re = new RegExp(`^[${punc}]*| |[${punc}]*$`, 'g')
    return word.replace(re,'')
}

function stripNonArabic(word) {
    const ar_chars = Object.keys(uni2buck).join('')
    const re = new RegExp(`^[^${ar_chars}]*|[^${ar_chars}]*$`, 'g')
    return word.replace(re, '')
}

function stripHarakat(buckWord) {
    const har_chars = harakat.join('')
    const re = new RegExp(`^[${har_chars}]*|[${har_chars}]*$`)
    return buckWord.replace(re, '')
}

function translateWordIfArabic(word) {
    word = stripNonArabic(word)
    const arabic = new RegExp(Object.keys(uni2buck).join('|'), 'g')
    if (!arabic.test(word)) {
        return null
    }
    return translateRawWord(word)
}

// let testWords = ["الغاز", "haha", "الاز",'\nأسواق\n', 'أس\nواق']
//
// for (const word of testWords) {
//     translateWordIfArabic(word)
// }


async function translateSentence(s) {
    s = preprocessInputSentence(s)

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
        return null
    let body = await response.json();

    let slist = body["sentences"].map(s => s["trans"])
    let transSentence = processTransSentence(slist)

    return transSentence;
}

function preprocessInputSentence(s) {
    s = s.replace(/\s+/g,' ')

    if (s.slice(-1) == "؟")
        return s

    let ar_comma = ["،", ","]
    // let ar_conjunctions = ["و", "ف", "ثم","حتّى", "أو", "لكن", "بل", "أم"]
    let ar_conjunctions = ["و"]
    function replacer(match, offset, string) {
        let nextWord = string.slice(offset+1).match(/\S+/)[0]
        nextWord = detransliterate(removeHarakat(transliterate(nextWord)))
        let startsWithCon = (new RegExp(`^${ar_conjunctions.join("|")}`)).test(nextWord)
        if (startsWithCon) {
            return match + "\n"
        } else {
            return match
        }
    }
    s = s.replace(new RegExp(ar_comma.join("|"), 'g'), replacer)

    return s
}

function processTransSentence(slist) {
    let transSentence = ""
    for (let i = 0; i < slist.length; i++) {
        slist[i] = slist[i].replace(/\s+$/, " ")
        if (i == 0) {
            slist[i] = slist[i].charAt(0).toUpperCase() + slist[i].slice(1)
        } else {
            if (slist[i-1].slice(-2, -1) == ".") {
                slist[i] = slist[i].charAt(0).toUpperCase() + slist[i].slice(1)
            } else {
                slist[i] = slist[i].charAt(0).toLowerCase() + slist[i].slice(1)
            }
        }

        transSentence += slist[i]
    }
    return transSentence
}

export {translateWordIfArabic, loadDictData, isArabicChar, translateSentence}