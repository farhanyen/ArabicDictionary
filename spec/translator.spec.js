import {Translator} from "../src/translator.js"

// let Translator = require('../src/translator.js').Translator

let translator

beforeAll(() => {
    translator = new Translator()
    return translator.init()
})

describe('translateArabicWord', () => {

    it("رَبُّه", () => {
        const result = translator.translateArabicWord("رَبُّه")
        expect(result).toEqual([
            {word: 'رَبّه', def: 'lord;master [its/his]', root: 'رب' },
            {word: 'رَبّه', def: 'owner;proprietor [its/his]', root: 'رب' },
        ])
    });

    it("رَبُّه2", () => {
        expect(() => {translator.translateArabicWord("رَبُّه2")}).toThrow()
    });
});

