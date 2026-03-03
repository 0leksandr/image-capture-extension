
const actions = {
    "Open": "openImage",
    "Reload": "reloadImage",
    "Hide": "hideImage",
    "Invert": "invert",
};

for (const action in actions) {
    chrome.contextMenus.create({
        title: action,
        contexts: ["all"],
        // onclick: actions[action],
        id: actions[action],
    });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
    chrome.tabs.sendMessage(tab.id, {"action": info.menuItemId});
});

console.log("started " + (new Date()).toISOString() + " " + window.location.href);
