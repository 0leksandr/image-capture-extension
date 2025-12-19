let clickedElement;

document.addEventListener(
    "mousedown",
    event => { clickedElement = event.target; },
    true
);

function decodeHTML(html) {
    let element = document.createElement('div');
    element.innerHTML = html;
    return element.textContent;
}

function locateImage() {
    while (true) {
        let match = clickedElement.outerHTML.match(new RegExp("background-image *: *url\\(([^)]+)\\)|<img(?: [^>]* | )src=([^ >]+)"));
        if (match) match = decodeHTML(match[1] || match[2]).match(/^"(.+)"$|^'(.+)'$/);
        if (match) return match[1] || match[2];
        clickedElement = clickedElement.parentNode;
        if (!clickedElement || clickedElement === document.body) break;
    }
}

function getImage() {
    const url = locateImage();
    if (url) window.setTimeout(() => window.open(url), 0);
}

function reloadImage() {
    const url = locateImage();
    if (url) {
        if (clickedElement.nodeName.toLowerCase() === "img") {
            clickedElement.src = url + `?t=${new Date().getTime()}`;
        }
    }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    ({
        "getImage"   : getImage,
        "reloadImage": reloadImage,
    }[request.action])();
});

console.log("image-capture-extension loaded " + (new Date()).toISOString() + " " + window.location.href);
