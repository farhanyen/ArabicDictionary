import {Translator} from "./translator.js"
let translator = new Translator()
await translator.init()


function testTranslateWordIfArabic() {
    let tWord1 = "نَحْوَها"
    console.log(translator.transliterate(tWord1))
    console.log(translator.translateWordIfArabic(tWord1))

}

testTranslateWordIfArabic()
let tWord1 = "رَبُّهُ"
let tWord2 = "رَبُّهُۥ"
