import {BuckDict} from "../src/buckdict.js"

let buckDict

beforeAll(() => {
    buckDict = new BuckDict()
    return buckDict.init()
})

describe('transliterate', () => {
    it("نَحْوَها", () => {
        const result = buckDict.transliterate("نَحْوَها")
        expect(result).toEqual("naHowahA")
    })
})

