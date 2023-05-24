import {Translator} from "../src/translator.js"

let translator

beforeAll(() => {
    translator = new Translator()
    return translator.init()
})

describe('transliterate', () => {
    it("نَحْوَها", () => {
        const result = translator.transliterate("نَحْوَها")
        expect(result).toEqual("naHowahA")
    })
})
describe('translateWordIfArabic', () => {

    it("رَبُّه", () => {
        const result = translator.translateWordIfArabic("رَبُّه")
        expect(result).toEqual([
            {word: 'رَبّه', def: 'lord;master [its/his]', root: 'رب' },
            { word: 'رَبّه', def: 'owner;proprietor [its/his]', root: 'رب' },
        ])
    });

    it("رَبُّه2", () => {
        const result = translator.translateWordIfArabic("رَبُّه2")
        expect(result).toEqual([
            {word: 'رَبّه', def: 'lord;master [its/his]', root: 'رب' },
            { word: 'رَبّه', def: 'owner;proprietor [its/his]', root: 'رب' },
        ])
    });

    it("رَ2بُّه", () => {
        const result = translator.translateWordIfArabic("ر2َبُّه")
        expect(result).toBeNull()
    });
});

