const GET_IMAGE_ID    = "GET_IMAGE_ID";
const RELOAD_IMAGE_ID = "RELOAD_IMAGE_ID";

chrome.contextMenus.create({
    title: "Get image",
    contexts: ["all"],
    // onclick: getimage,
    id: GET_IMAGE_ID,
});
chrome.contextMenus.create({
    title: "Reload image",
    contexts: ["all"],
    id: RELOAD_IMAGE_ID,
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    const action = {
        GET_IMAGE_ID: "getImage",
        RELOAD_IMAGE_ID: "reloadImage",
    }[info.menuItemId];
    chrome.tabs.sendMessage(tab.id, {"action": action});
});

console.log("started " + (new Date()).toISOString() + " " + window.location.href);
