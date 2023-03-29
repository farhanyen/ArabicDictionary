function isPDF(details) {
    const headers = details.responseHeaders;

    let headerValue = header.value.toLowerCase().split(';', 1)[0].trim();
    if (headerValue == 'application/pdf') {
        return true;
    }
    if (headerValue === 'application/octet-stream') {
        if (details.url.toLowerCase().indexOf('.pdf') > 0) {
            return true;
        }
    }
    console.log(headers);

    return false;
}

chrome.webRequest.onBeforeRedirect.addListener(
    (details) => {
        if (!isPDF(details)) {
            return;
        }

        let url = details.url;
        let redirectUrl = chrome.runtime.getURL(`/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}`);
        chrome.tabs.update(details.tabId, {
            url: redirectUrl
        });
    },
    {
        urls: ['<all_urls>'],
        types: ['main_frame', 'sub_frame'],
    },
    ['blocking', 'responseHeaders']
)

chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
        if (!isPDF(details)) {
            return;
        }

        let url = details.url;
        let redirectUrl = chrome.runtime.getURL(`/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}`);
        chrome.tabs.update(details.tabId, {
            url: redirectUrl
        });
    },
    {
        urls: ['*://*/*.pdf', '*://*/*.PDF'],
        types: ['main_frame', 'sub_frame'],
    },
    ['blocking', 'responseHeaders']
)