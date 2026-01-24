"use strict";

let clickedElement;

document.addEventListener(
    "mousedown",
    event => { clickedElement = event.target; },
    true,
);

function decodeHTML(html) {
    let element = document.createElement('div');
    element.innerHTML = html;
    return element.textContent;
}

class ImageElement {
    constructor(element) {
        if (new.target === ImageElement) {
            throw new Error("ImageElement is abstract and cannot be instantiated directly");
        }
        this.element = element;
    }

    locateImage() {
        throw new Error("locateImage() must be implemented by subclass");
    }

    updateUrl(url) {
        throw new Error("updateUrl() must be implemented by subclass");
    }

    reloadImage() {
        const url = this.locateImage();
        if (url) {
            const newUrl = url + `?t=${new Date().getTime()}`;
            this.updateUrl(newUrl);
        }
    }

    hideImage() {
        // this.updateUrl('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E');
        this.updateUrl('https://as2.ftcdn.net/v2/jpg/06/57/37/01/1000_F_657370150_pdNeG5pjI976ZasVbKN9VqH1rfoykdYU.jpg');

        this.element.setAttribute("my-hidden-image", "");
    }

    invert() {
        this.element.classList.toggle("my-inverted-image");
    }

    static canHandle(element) {
        throw new Error("canHandle() must be implemented by subclass");
    }
}

class ImgSrcsetElement extends ImageElement {
    static canHandle(element) {
        return element.nodeName.toLowerCase() === "img" && element.hasAttribute('srcset');
    }

    locateImage() {
        const srcset = this.element.getAttribute('srcset');
        if (!srcset) return null;

        const sources = srcset.split(',').map(s => s.trim());
        if (sources.length === 0) return null;

        let maxSize = 0;
        let maxUrl = null;

        for (const source of sources) {
            const parts = source.split(/\s+/);
            const url = parts[0];
            const descriptor = parts[1];

            let size = 0;
            if (!descriptor) {
                size = 1;
            } else if (descriptor.endsWith('w')) {
                size = parseInt(descriptor);
            } else if (descriptor.endsWith('x')) {
                size = parseFloat(descriptor) * 1000;
            }

            if (size > maxSize) {
                maxSize = size;
                maxUrl = url;
            }
        }

        if (!maxUrl) return null;

        const match = decodeHTML(maxUrl).match(/^"(.+)"$|^'(.+)'$/);
        return match ? (match[1] || match[2]) : maxUrl;
    }

    updateUrl(url) {
        const srcset = this.element.getAttribute('srcset');
        if (!srcset) return;

        const sources = srcset.split(',').map(s => s.trim());
        const updatedSources = sources.map(source => {
            const parts = source.split(/\s+/);
            parts[0] = url;
            return parts.join(' ');
        });

        this.element.srcset = updatedSources.join(', ');
    }
}

class ImgElement extends ImageElement {
    static canHandle(element) {
        return element.nodeName.toLowerCase() === "img";
    }

    locateImage() {
        const src = this.element.getAttribute('src');
        if (!src) return null;

        const match = decodeHTML(src).match(/^"(.+)"$|^'(.+)'$/);
        return match ? (match[1] || match[2]) : src;
    }

    updateUrl(url) {
        this.element.src = url;
    }
}

class BackgroundImageElement extends ImageElement {
    static canHandle(element) {
        const computedStyle = window.getComputedStyle(element);
        const backgroundImage = computedStyle.backgroundImage;
        return backgroundImage && backgroundImage !== "none";
    }

    locateImage() {
        const computedStyle = window.getComputedStyle(this.element);
        const backgroundImage = computedStyle.backgroundImage;

        if (!backgroundImage || backgroundImage === "none") {
            return null;
        }

        const match = backgroundImage.match(/url\((['"]?)(.+?)\1\)/);
        if (match) {
            const url = match[2];
            const decodedMatch = decodeHTML(url).match(/^"(.+)"$|^'(.+)'$/);
            return decodedMatch ? (decodedMatch[1] || decodedMatch[2]) : url;
        }

        return null;
    }

    updateUrl(url) {
        this.element.style.backgroundImage = `url('${url}')`;
    }
}

const IMAGE_ELEMENT_HANDLERS = [
    ImgSrcsetElement,
    ImgElement,
    BackgroundImageElement,
];

function createImageElement(element) {
    let currentElement = element;

    while (currentElement && currentElement !== document.body) {
        for (const Handler of IMAGE_ELEMENT_HANDLERS) {
            if (Handler.canHandle(currentElement)) {
                return new Handler(currentElement);
            }
        }
        currentElement = currentElement.parentNode;
    }

    return null;
}

function getImage() {
    window.setTimeout(
        () => window.open(createImageElement(clickedElement).locateImage()),
        0,
    );
}

function reloadImage() {
    createImageElement(clickedElement).reloadImage();
}

function hideImage() {
    createImageElement(clickedElement).hideImage();
}

function invert() {
    createImageElement(clickedElement).invert();
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    ({
        getImage,
        reloadImage,
        hideImage,
        invert,
    }[request.action])();
});

console.log("image-capture-extension loaded " + (new Date()).toISOString() + " " + window.location.href);
