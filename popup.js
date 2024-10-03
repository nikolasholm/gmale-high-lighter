document.addEventListener('DOMContentLoaded', function() {
    const blacklistedPhrasesTextarea = document.getElementById('blacklistedPhrases');
    const saveButton = document.getElementById('saveButton');
    const statusElement = document.getElementById('status');
    const highlightToggle = document.getElementById('highlightToggle');

    chrome.storage.sync.get(['blacklistedPhrases', 'highlightEnabled'], function(data) {
        blacklistedPhrasesTextarea.value = data.blacklistedPhrases || '';
        highlightToggle.checked = data.highlightEnabled !== false;
    });

    saveButton.addEventListener('click', function() {
        const phrasesText = blacklistedPhrasesTextarea.value;
        const phrasesArray = phrasesText.split('\n').map(phrase => phrase.trim()).filter(phrase => phrase !== '');
        const highlightEnabled = highlightToggle.checked;

        chrome.storage.sync.set({ 
            blacklistedPhrases: phrasesArray.join('\n'),
            highlightEnabled: highlightEnabled
        }, function() {
            statusElement.textContent = 'Settings saved!';
            setTimeout(() => {
                statusElement.textContent = '';
            }, 2000);
        });
    });
});