async function readExtensionFile(fp) {
    const url = chrome.runtime.getURL(fp);
    const response = await fetch(url);
    const text = await response.text();
    return text;
}

export default readExtensionFile;
