function toggleListen() {
    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('toggleInput').addEventListener('change', onToggle);
    });

}
function onToggle(e) {
    chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
            console.log(tab)
            chrome.tabs.sendMessage(tab.id, "toggleExtension");
        });
    });
}

toggleListen()

