

const epubBase = chrome.runtime.getURL("/epub.js/viewer/viewer.html?file=")
const pdfBase = chrome.runtime.getURL("/pdf.js/web/viewer.html?file=")

const epubTest = chrome.runtime.getURL("/epub.js/viewer/viewer.html")

function addEpubRule() {
    chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [
            {
                "id": 3,
                "priority": 1,
                "action": {
                    "type": "redirect",
                    "redirect": {
                        // "regexSubstitution": epubBase + "\\0"
                        // "regexSubstitution": "google.com"
                        // "url": "https://developer.chrome.com/docs/extensions/"
                        // "url": chrome.runtime.getURL("tooltip.js")
                        "extensionPath": "/tooltip.js"
                        // "url": "https://google.com"
                    }
                },
                "condition": {
                    // "urlFilter": "file://*/*.epub",
                    "regexFilter": "file:.//.*/.*\\.epub",
                    "resourceTypes": [
                        "main_frame"
                    ]
                }
            }
        ],
        removeRuleIds: [3]
    })
}


function addRule() {
    chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [
            {
                "id": 4,
                "priority": 1,
                "action": {
                    "type": "redirect",
                    "redirect": {
                        "url": "https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/"
                    }
                },
                "condition": {
                    "urlFilter": "https://developer.chrome.com/docs/extensions/reference/declarativeWebRequest/",
                    "resourceTypes": ["main_frame"]
                }
            }
        ],
        removeRuleIds: [4]
    })
}

chrome.runtime.onStartup.addListener( () => {
    console.log(`onStartup()`);
    addEpubRule();
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("onInstalled()");
    addEpubRule();
    // addRule();
})

// addRule();

chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((e) => {
    const msg = `Navigation to ${e.request.url} redirected on tab ${e.request.tabId}.`;
    console.log(msg);
});

console.log('Service worker started.');