(function() {
  let port;
  let phrases = [];
  let highlightEnabled = true;
  let highlightIntervals = new Map();

  function connectToBackground() {
    port = chrome.runtime.connect({name: "highlighter"});
    port.onDisconnect.addListener(reconnectToBackground);
    port.onMessage.addListener(handleMessage);
    requestSettings();
  }

  function reconnectToBackground() {
    console.log("Disconnected. Attempting to reconnect...");
    setTimeout(connectToBackground, 1000);
  }

  function handleMessage(msg) {
    if (msg.action === "updateSettings") {
      phrases = msg.phrases.split('\n').map(phrase => phrase.trim()).filter(phrase => phrase !== '');
      highlightEnabled = msg.highlightEnabled;
      if (highlightEnabled) {
        startHighlighting();
      } else {
        stopHighlighting();
      }
    }
  }

  function requestSettings() {
    port.postMessage({action: "getBlacklistedPhrases"});
  }

  function startHighlighting() {
    const activeComposeView = document.querySelector('div[role="textbox"][aria-label="Message Body"], div[aria-label="Message Body"]');
    if (activeComposeView && !highlightIntervals.has(activeComposeView)) {
      const interval = setInterval(() => highlightTextbox(activeComposeView), 1000);
      highlightIntervals.set(activeComposeView, interval);
    }
  }

  function highlightTextbox(textbox) {
    if (!textbox) {
      console.error('Textbox is null or undefined');
      return;
    }

    if (!textbox.parentNode) {
      console.error('Textbox parent node is null or undefined');
      return;
    }

    let overlay = textbox.nextElementSibling;
    if (!overlay || !overlay.classList.contains('gmail-highlighter-overlay')) {
      overlay = document.createElement('div');
      overlay.classList.add('gmail-highlighter-overlay');
      overlay.style.position = 'absolute';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '1';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      
      try {
        if (textbox.nextSibling) {
          textbox.parentNode.insertBefore(overlay, textbox.nextSibling);
        } else {
          textbox.parentNode.appendChild(overlay);
        }
      } catch (error) {
        console.error('Error inserting overlay:', error);
        return;
      }
      
      if (textbox.parentNode.style) {
        textbox.parentNode.style.position = 'relative';
      }
    }

    overlay.innerHTML = '';
    const text = textbox.innerText;

    phrases.forEach(phrase => {
      const regex = new RegExp(phrase, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const range = document.createRange();
        const textNode = findTextNode(textbox, match.index);
        if (textNode) {
          const startOffset = match.index - getTextNodeOffset(textbox, textNode);
          range.setStart(textNode, startOffset);
          range.setEnd(textNode, startOffset + match[0].length);
          const rects = range.getClientRects();
          for (let rect of rects) {
            createHighlight(rect, overlay);
          }
        }
      }
    });
  }

  function findTextNode(element, targetOffset) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let currentNode;
    let currentOffset = 0;
    while (currentNode = walker.nextNode()) {
      if (currentOffset + currentNode.length > targetOffset) {
        return currentNode;
      }
      currentOffset += currentNode.length;
    }
    return null;
  }

  function getTextNodeOffset(element, targetNode) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let currentNode;
    let offset = 0;
    while (currentNode = walker.nextNode()) {
      if (currentNode === targetNode) return offset;
      offset += currentNode.length;
    }
    return 0;
  }

  function createHighlight(rect, overlay) {
    const highlight = document.createElement('div');
    highlight.style.position = 'absolute';
    highlight.style.left = `${rect.left - overlay.getBoundingClientRect().left}px`;
    highlight.style.top = `${rect.top - overlay.getBoundingClientRect().top}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
    highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
    highlight.style.pointerEvents = 'none';
    overlay.appendChild(highlight);
  }

  function stopHighlighting() {
    highlightIntervals.forEach((interval, textbox) => {
      clearInterval(interval);
      const overlay = textbox.nextElementSibling;
      if (overlay && overlay.classList.contains('gmail-highlighter-overlay')) {
        overlay.remove();
      }
    });
    highlightIntervals.clear();
  }

  try {
    connectToBackground();
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const newComposeView = node.querySelector('div[role="textbox"][aria-label="Message Body"]');
              if (newComposeView) {
                startHighlighting();
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  } catch (error) {
    console.error('Error in Gmail highlighter:', error);
  }
})();