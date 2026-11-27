(function () {
  if (window.__SORAREPILOT_BRIDGE_LOADED__) return;
  window.__SORAREPILOT_BRIDGE_LOADED__ = true;

  function isContextValid() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  function safePostMessage(payload) {
    try {
      window.postMessage(payload, '*');
    } catch {}
  }

  safePostMessage({ source: 'sorarepilot-ext', type: 'SORAREPILOT_EXT_READY', version: '0.1.0' });

  window.addEventListener('message', function (ev) {
    if (ev.source !== window || !ev.data) return;
    const d = ev.data;
    if (d.source !== 'sorarepilot-app') return;

    if (d.type === 'SORAREPILOT_EXT_COMMAND') {
      if (!isContextValid()) {
        safePostMessage({
          source: 'sorarepilot-ext',
          type: 'SORAREPILOT_EXT_ACK',
          requestId: d.requestId,
          response: { ok: false, error: 'Extension context invalidated' }
        });
        return;
      }
      try {
        chrome.runtime.sendMessage(d.payload, function (resp) {
          if (!isContextValid()) return;
          if (chrome.runtime && chrome.runtime.lastError) {
            safePostMessage({
              source: 'sorarepilot-ext',
              type: 'SORAREPILOT_EXT_ACK',
              requestId: d.requestId,
              response: { ok: false, error: chrome.runtime.lastError.message }
            });
            return;
          }
          safePostMessage({
            source: 'sorarepilot-ext',
            type: 'SORAREPILOT_EXT_ACK',
            requestId: d.requestId,
            response: resp
          });
        });
      } catch (err) {
        safePostMessage({
          source: 'sorarepilot-ext',
          type: 'SORAREPILOT_EXT_ACK',
          requestId: d.requestId,
          response: { ok: false, error: err && err.message ? err.message : 'Bridge error' }
        });
      }
    }
  });

  if (isContextValid() && chrome.runtime && chrome.runtime.onMessage) {
    try {
      chrome.runtime.onMessage.addListener(function (msg) {
        if (!isContextValid() || !msg) return;
        if (msg.type === 'QUEUE_STATE_UPDATED') {
          safePostMessage({
            source: 'sorarepilot-ext',
            type: 'QUEUE_STATE_UPDATED',
            state: msg.state
          });
        }
      });
    } catch {}
  }
})();
