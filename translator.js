
function printFilePath(path) {
    console.log("get translation from: ", path)
}

async function readLocalFile(path) {
    const fs = (await import('fs')).promises
    try {
        const data = await fs.readFile(path, { encoding: 'utf8' })
        return data
    } catch (err){
        console.log(err)
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
        if (fields.length < 4) {
            console.log(fields)
        }
        const entry = {
            diacrtics: fields[1],
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
                    word: prefEntry.diacrtics+stemEntry.diacrtics+suffEntry.diacrtics,
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

const diacritics = ['F','N','K','a','u','i','~','o']

function removeDiacratics(word) {
    return word.replace(new RegExp(diacritics.join('|'), 'g'), '')
}
// translateWord("wAlgAz")
// translateWord(removeDiacratics('wa>alogAz'))

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

function removePunctuation(word) {
    const ar_punc = '\u060C\u060D\u060E\u060F\u061B\u061E\u061F'
    const en_punc = ':;.!\'"-_`~\\s\\[\\]\\{\\}\\^\\$\\*\\+'
    const punc = `${ar_punc}${en_punc}`
    const re = new RegExp(`^[${punc}]*|[${punc}]*$`, 'g')
    return word.replace(re,'')
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
    let transList = translateWord(removeDiacratics(transliterate(uniWord)))
    detransliterateTransList(transList)
    return transList
}

// let testWord = "الغاز"
// console.log(transliterate(testWord))
//
// translateRawWord(testWord)

function translateWordIfArabic(word) {
    // const arabic = /^[\u0600-\u06FF]*$/
    word = removePunctuation(word)
    // console.log("trimmed word:", word)
    const arabic = new RegExp(Object.keys(uni2buck).join('|'), 'g')
    if (!arabic.test(word)) {
        console.log("not arabic word")
        return null
    }
    return translateRawWord(word)
}

let testWords = ["الغاز", "haha", "الاز",'\nأسواق\n', 'أس\nواق']

for (const word of testWords) {
    translateWordIfArabic(word)
}


export {translateWordIfArabic, loadDictData}