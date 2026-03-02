(function() {
    "use strict";

    var sdk = require("microsoft-cognitiveservices-speech-sdk");
    var readline = require("readline");

    let key = "be18db73754841b1a57106172cc0e30d";
    let region = "eastus";

    // Initialize speech configuration
    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);

    // Set the voice name
    speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";

    // Change this line to use the default speaker output
    const audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();

    // Create the speech synthesizer
    var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("Enter some text that you want to speak >\n> ", function (text) {
        rl.close();
        // Start the synthesizer and wait for a result
        synthesizer.speakTextAsync(text,
            function (result) {
                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    console.log("Synthesis finished.");
                } else {
                    console.error("Speech synthesis canceled, " + result.errorDetails +
                        "\nDid you set the speech resource key and region values?");
                }
                synthesizer.close();
                synthesizer = null;
            },
            function (err) {
                console.trace("err - " + err);
                synthesizer.close();
                synthesizer = null;
            });
        console.log("Now synthesizing...");
    });
}());
