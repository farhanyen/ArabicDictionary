var book = ePub();
var rendition;

var inputElement = document.getElementById("input");

inputElement.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (window.FileReader) {
        var reader = new FileReader();
        reader.onload = openBook;
        reader.readAsArrayBuffer(file);
    }
});

async function openURLBook() {
    const urlParams = new URLSearchParams(window.location.search);
    const fileUrl = urlParams.get('file');

    const response = await fetch(fileUrl);
    const blob = await response.blob();
    console.log(blob);

    let reader = new FileReader();
    reader.onload = openBook;
    reader.readAsArrayBuffer(blob);
}
openURLBook();

async function openBook(e){
    var bookData = e.target.result;
    var title = document.getElementById("title");
    var next = document.getElementById("next");
    var prev = document.getElementById("prev");

    book.open(bookData, "binary");

    rendition = book.renderTo("viewer", {
        width: "100%",
        height: 600
    });

    // rendition.themes.default({ "p": { "font-family": "initial", "font-weight": "400", "font-size": "22px !important"}})
    // rendition.themes.default({ "p": {"font-weight": "400", "font-size": "22px !important"}})
    // rendition.themes.default({ "p": { "font-family": "Times New Roman", "font-weight": "400", "font-size": "22px !important"}})
    // rendition.themes.default({ "p": { "font-family": "Tahoma", "font-weight": "400", "font-size": "24px !important"}})
    // rendition.themes.default({ "p": { "font-family": "Times", "font-weight": "normal", "font-size": "20px !important"}})
    // rendition.themes.default({ "p": { "font-family": "Noto", "font-weight": "normal", "font-size": "20px !important"}})
    rendition.themes.default({ "p": { "font-family": "Noto Sans Arabic", "font-weight": "normal", "font-size": "20px !important"}})


    console.log(book);
    console.log(rendition);

    await rendition.display();

    var keyListener = function(e){
        // Left Key
        if ((e.keyCode || e.which) == 37) {
            book.package.metadata.direction === "rtl" ? rendition.next() : rendition.prev();
        }

        // Right Key
        if ((e.keyCode || e.which) == 39) {
            book.package.metadata.direction === "rtl" ? rendition.prev() : rendition.next();
        }
    };

    rendition.on("keyup", keyListener);
    rendition.on("relocated", function(location){
        // console.log(location);
    });

    next.addEventListener("click", function(e){
        book.package.metadata.direction === "rtl" ? rendition.prev() : rendition.next();
        e.preventDefault();
    }, false);

    prev.addEventListener("click", function(e){
        book.package.metadata.direction === "rtl" ? rendition.next() : rendition.prev();
        e.preventDefault();
    }, false);

    document.addEventListener("keyup", keyListener, false);


    // rendition.hooks.content.register(function(contents){
    //     return contents.addStyleSheet("../../selection.css")
    // });

    rendition.hooks.content.register(function(contents){

        var loaded = Promise.all([
            contents.addStylesheet("../../selection.css")
        ]);

        // return loaded promise
        return loaded;
    });

    let iframe = document.querySelector("iframe");
    let iframeDoc = iframe.contentDocument;
    let link = iframeDoc.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href =  chrome.runtime.getURL("../../selection.css");
    iframeDoc.head.appendChild(link);
}