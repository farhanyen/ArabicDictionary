import Translator from "./translator.js"

//     globalThis.fetch = (await import("node-fetch")).default;
//     globalThis.Headers = (await import("node-fetch")).Headers;


function Anki() {
}

Anki.prototype.init = async function(controller) {
    this.translator = new Translator();
    await this.translator.init();
}

Anki.prototype.invoke = async function(action, version, params={}) {

    let raw = JSON.stringify({action, version, params});

    let requestOptions = {
        method: 'POST',
        body: raw,
    };

    const response = await fetch('http://127.0.0.1:8765', requestOptions)
    if (response.status != 200)
        return null;
    let respBody = await response.json();
    return respBody;
}

Anki.prototype.addNote = async function (w, s, imgURL = null) {
    let ts = await this.translator.gTranslateSentence(s);
    let transList = await this.translator.translateArabicWord(w);
    let tw = transList[0].def;
    const apiroot = "https://translate.googleapis.com/translate_tts?";
    let params = {
        client: "gtx",
        ie: "UTF-8",
        tl: "ar",
        tk: "435555.435555",
        q: s
    };

    const paramStr = new URLSearchParams(params);
    const urlS = apiroot + paramStr;

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
    const response = await fetch("https://yt-dl-service-fkgahhsdeq-uc.a.run.app/download_snippet", {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "video_url": "https://www.youtube.com/watch?v=aGOV5R7M1Js",
            "start_time": "00:00:00",
            "end_time": "00:00:05"
        })
    });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);

    paramStr.set("q", w);
    const urlW = apiroot + paramStr;

    let noteParams = {
        "note": {
            "deckName": "ArabicDict",
            "modelName": "TextVocabCards",
            "fields": {
                "Word": w,
                "Sentence": s,
                "WordTrans": tw,
                "SentenceTrans": ts,
            },
            "options": {
                "allowDuplicate": false,
                "duplicateScope": "deck",
                "duplicateScopeOptions": {
                    "deckName": "Default",
                    "checkChildren": false,
                    "checkAllModels": false
                }
            },
            "tags": [
                "ArabicDict"
            ],
            "audio": [{
                "data": base64Data,
                "filename": `${s}.mp3`,
                "fields": [
                    "SentenceAudio"
                ]
            }, {
                "url": urlW,
                "filename": `${w}.mp3`,
                "fields": [
                    "WordAudio"
                ]
            }],
        }
    };

    if (imgURL != null) {
        noteParams.note.modelName = "TextVocabCardsImg";
        noteParams.note["picture"] = [{
            "data": imgURL,
            "filename": `${s}.png`,
            "fields": [
                "Image"
            ]
        }];
    }

    let result = await this.invoke('addNote', 6, noteParams);
    return result;
}

export default Anki

//
// let anki = new Anki()
// let result;


// result = await anki.invoke('deckNames', 6);
// console.log(`got list of decks: ${JSON.stringify(result)}`);

// let testWord = "مَدْرَسَةِ";
// let testString = "الْقُرُودُ جاءَتْ مِنْ كُلِّ مَكَانٍ لِتَتَعَلَّمَ فِي مَدْرَسَةِ السُّلْطانِ."
// result = await anki.addNote(testWord, testString);
// console.log(result)

