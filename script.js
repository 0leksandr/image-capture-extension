
// noinspection JSNonASCIINames

const actions = {
    "🌗 Invert": "invertImage",
    "❌ Hide": "hideImage",
    "💾 Save": "saveImageAsPng",
    "↗️ Open": "openImage",
    "🔄 Reload": "reloadImage",
};

chrome.runtime.onInstalled.addListener(() => {
    for (const action in actions) {
        chrome.contextMenus.create({
            title: action,
            contexts: ["all"],
            id: actions[action],
        });
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    chrome.tabs.sendMessage(tab.id, {"action": info.menuItemId});
});

console.log("started " + (new Date()).toISOString());
