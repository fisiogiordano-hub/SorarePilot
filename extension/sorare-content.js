(function () {
  if (window.__SORAREPILOT_CONTENT_LOADED__) return;
  window.__SORAREPILOT_CONTENT_LOADED__ = true;

  let timeoutId = null;
  let intervalId = null;
  let lastPayload = '';

  function isContextValid() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  function stopLoops() {
    if (timeoutId !== null) { clearTimeout(timeoutId); timeoutId = null; }
    if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
  }

  function safeSendMessage(payload, callback) {
    if (!isContextValid()) {
      stopLoops();
      return false;
    }
    try {
      if (typeof callback === 'function') {
        chrome.runtime.sendMessage(payload, (resp) => {
          if (!isContextValid()) { stopLoops(); return; }
          if (chrome.runtime && chrome.runtime.lastError) {
            callback({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          callback(resp);
        });
      } else {
        const p = chrome.runtime.sendMessage(payload);
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
      return true;
    } catch {
      stopLoops();
      return false;
    }
  }

  function extractFromLines(lines) {
    const missions = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const next = lines[i + 1] || '';
      const isShortTitle =
        line.length >= 3 &&
        line.length <= 75 &&
        !/[.!?:]$/.test(line) &&
        !/^(earn|vinci|scegli|select|pick|classic|totalizza|gioca|play|ottieni premi|claim)\b/i.test(line);

      if (isShortTitle && next.length >= 12) {
        missions.push({ titolo: line, descrizione: next });
        i += 1;
      } else if (missions.length > 0 && line.length >= 10) {
        missions[missions.length - 1].descrizione += ` ${line}`;
      }
    }
    return missions;
  }

  function scrapeDailyMissions() {
    if (!document.body) return [];
    const bodyText = document.body.innerText || '';
    if (!bodyText || /nessuna missione disponibile|no missions? available/i.test(bodyText)) {
      return [];
    }

    const rawLines = bodyText
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const startIdx = rawLines.findIndex((l) => /^(giornaliero|daily(\s+missions?)?|missioni\s+giornaliere)$/i.test(l));
    const afterStart = startIdx >= 0 ? rawLines.slice(startIdx + 1) : rawLines;
    const endRelIdx = afterStart.findIndex((l) => /^(serie|series|settimanale|weekly)$/i.test(l));
    const sectionLines = (endRelIdx === -1 ? afterStart : afterStart.slice(0, endRelIdx)).filter(
      (l) =>
        l.length > 1 &&
        !/^[1-3]$/.test(l) &&
        !/^[▲▼]$/.test(l) &&
        !/^(GIOCA|PLAY)$/i.test(l) &&
        !/^(Ottieni premi|Claim rewards?)/i.test(l)
    );

    const missions = extractFromLines(sectionLines);
    if (missions.length > 0) return missions;

    if (/missioni|missions/i.test(location.pathname) || /missione|mission/i.test(bodyText)) {
      return extractFromLines(rawLines);
    }

    return [];
  }

  function pushMissions(force = false, emitEvent = true) {
    if (!isContextValid()) {
      stopLoops();
      return [];
    }
    const missioni = scrapeDailyMissions();
    const serialized = JSON.stringify(missioni);
    if (missioni.length > 0 && (force || serialized !== lastPayload)) {
      lastPayload = serialized;
      if (emitEvent) {
        safeSendMessage({
          type: 'MISSIONS_SCRAPED',
          url: location.href,
          missioni
        });
      }
    }
    return missioni;
  }

  timeoutId = setTimeout(() => pushMissions(false, true), 1500);
  intervalId = setInterval(() => {
    if (!isContextValid()) { stopLoops(); return; }
    pushMissions(false, true);
  }, 5000);

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!isContextValid()) { stopLoops(); return; }
      if (!msg) return;

      if (msg.type === 'SCRAPE_MISSIONS_NOW') {
        const missioni = pushMissions(true, false);
        sendResponse({ ok: true, missioni });
        return true;
      }

      if (msg.type === 'SUBMIT_MISSION_ITEM') {
        window.dispatchEvent(
          new CustomEvent('SORAREPILOT_EXT_SUBMIT_ITEM', {
            detail: { flow: msg.flow, item: msg.item }
          })
        );
        sendResponse({ ok: true, dispatched: true, url: location.href });
        return true;
      }
    });
  }

  window.addEventListener('SORAREPILOT_EXT_SUBMIT_ITEM', (ev) => {
    const d = ev && ev.detail ? ev.detail : {};
    const btns = Array.from(document.querySelectorAll('button'));
    const pattern =
      d && d.flow === 'sales'
        ? /^(sell|list|relist|vendi|rimetti in vendita|metti in vendita|submit|confirm|invia|salva|conferma)$/i
        : /^(submit|confirm|invia|salva|conferma)$/i;
    const target = btns.find((b) => !b.disabled && pattern.test((b.innerText || '').trim()));
    if (target) {
      if (d && d.flow === 'sales') {
        console.log('[SorarePilot Ext] Azione vendita su carta:', d.item);
      }
      target.click();
    } else if (d && d.item) {
      console.warn('Pulsante non trovato per:', d.item);
    }
  });
})();
