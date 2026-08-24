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
        // this.updateUrl('https://as2.ftcdn.net/v2/jpg/06/57/37/01/1000_F_657370150_pdNeG5pjI976ZasVbKN9VqH1rfoykdYU.jpg');

        this.element.toggleAttribute("my-hidden-image");
    }

    invertImage() {
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

function getImageElement() {
    const handlers = [ImgSrcsetElement, ImgElement, BackgroundImageElement];

    for (const child of [clickedElement].concat(Array.from(clickedElement.querySelectorAll("*")))) {
        for (const handler of handlers) {
            if (handler.canHandle(child)) {
                return new handler(child);
            }
        }
    }

    let parent = clickedElement;
    while (parent && parent !== document.body) {
        for (const handler of handlers) {
            if (handler.canHandle(parent)) {
                return new handler(parent);
            }
        }
        for (const child of parent.childNodes) {
            for (const handler of handlers) {
                if (handler.canHandle(child)) {
                    return new handler(child);
                }
            }
        }
        parent = parent.parentNode;
    }

    throw new Error("Could not find image element");
}

function openImage() {
    window.setTimeout(
        () => window.open(getImageElement().locateImage()),
        0,
    );
}

function reloadImage() {
    getImageElement().reloadImage();
}

function hideImage() {
    getImageElement().hideImage();
}

function invertImage() {
    getImageElement().invertImage();
}

function getPngFilename(url) {
    try {
        const pathname = new URL(url, window.location.href).pathname;
        const base = pathname.substring(pathname.lastIndexOf('/') + 1) || 'image';
        return base.replace(/\.[^./]+$/, '') + '.png';
    } catch (e) {
        return 'image.png';
    }
}

function saveImageAsPng() {
    const url = getImageElement().locateImage();
    if (!url) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);

        try {
            canvas.toBlob(blob => {
                if (!blob) return;

                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = getPngFilename(url);
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(blobUrl);
            }, "image/png");
        } catch (e) {
            console.error("image-capture-extension: canvas is tainted, cannot export cross-origin image as PNG", url, e);
        }
    };

    img.onerror = () => {
        console.error("image-capture-extension: failed to load image for PNG conversion", url);
    };

    img.src = url;
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    ({
        openImage,
        reloadImage,
        hideImage,
        invertImage,
        saveImageAsPng,
    }[request.action])();
});

console.log("image-capture-extension loaded " + (new Date()).toISOString() + " " + window.location.href);
