import {Translator} from "../src/translator.js"

let translator

beforeAll(() => {
    translator = new Translator()
    return translator.init()
})
describe('translateWordIfArabic', () => {

    it("رَبُّه", async () => {
        const result = translator.translateWordIfArabic("رَبُّه")
        expect(result).toEqual([
            {word: 'رَبّه', def: 'lord;master [its/his]', root: 'رب' },
            { word: 'رَبّه', def: 'owner;proprietor [its/his]', root: 'رب' },
        ])
    });

    it("رَبُّه2", async () => {
        const result = translator.translateWordIfArabic("رَبُّه2")
        expect(result).toEqual([
            {word: 'رَبّه', def: 'lord;master [its/his]', root: 'رب' },
            { word: 'رَبّه', def: 'owner;proprietor [its/his]', root: 'رب' },
        ])
    });

    it("رَ2بُّه", async () => {
        const result = translator.translateWordIfArabic("ر2َبُّه")
        expect(result).toBeNull()
    });
});

