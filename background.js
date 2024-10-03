const defaultBlacklistedPhrases = [
    'toki', 'ehkä', 'hieman', 'melko', 'jotenkin', 'ainakin', 'mahdollisesti',
    'maybe', 'I think', 'kind of', 'sort of', 'probably', 'actually', 'hopefully',
    'just', 'possibly', 'more or less', 'at least', 'to be honest', 'about',
    'in a way', 'quite', 'could be'
].join('\n');

chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.get(['blacklistedPhrases', 'highlightEnabled'], function(data) {
        if (!data.blacklistedPhrases) {
            chrome.storage.sync.set({ blacklistedPhrases: defaultBlacklistedPhrases });
        }
        if (data.highlightEnabled === undefined) {
            chrome.storage.sync.set({ highlightEnabled: true });
        }
    });
});

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === "highlighter") {
        port.onMessage.addListener(function(msg) {
            if (msg.action === "getBlacklistedPhrases") {
                chrome.storage.sync.get(['blacklistedPhrases', 'highlightEnabled'], function(data) {
                    port.postMessage({
                        action: "updateSettings",
                        phrases: data.blacklistedPhrases || defaultBlacklistedPhrases,
                        highlightEnabled: data.highlightEnabled !== false
                    });
                });
            }
        });
    }
});
