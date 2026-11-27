const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const DIR = 'C:/Users/fisio/OneDrive/Desktop/sorare-sessione';
const URL = 'https://sorare.com/it/football/play/missions/play/limited';

async function estraiMissioni(options) {
  const o = options || {};
  const closeAfter = o.closeAfter !== undefined ? Boolean(o.closeAfter) : true;
  const userDataDir = o.userDataDir || DIR;
  const targetUrl = o.url || URL;

  const candidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ];
  const execPath = o.executablePath || candidates.find((p) => fs.existsSync(p));

  let browser;
  try {
    console.log('Apro Sorare per le missioni giornaliere...');
    browser = await puppeteer.launch({
      ...(execPath ? { executablePath: execPath } : {}),
      headless: false,
      userDataDir,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--start-maximized'],
      defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const deadline = Date.now() + 25000;
    let bodyText = '';
    let noMissions = false;
    let hasGiornaliero = false;

    while (Date.now() < deadline) {
      if (page.isClosed()) {
        throw new Error('Target page closed before content loaded');
      }
      const state = await page.evaluate(() => {
        const txt = document.body ? (document.body.innerText || '') : '';
        return {
          txt,
          hasG: /\bgiornaliero\b/i.test(txt),
          noM: /nessuna missione disponibile/i.test(txt)
        };
      });
      bodyText = state.txt;
      hasGiornaliero = state.hasG;
      noMissions = state.noM;

      if (hasGiornaliero || (noMissions && txtHasLoaded(bodyText))) {
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    function txtHasLoaded(t) {
      return Boolean(t && t.trim().length > 40);
    }

    let missioni = [];
    if (hasGiornaliero && !page.isClosed()) {
      const res = await page.evaluate(() => {
        const box = Array.from(document.querySelectorAll('div'))
          .filter((el) => el.classList && el.classList.contains('eAxlTh') && el.classList.contains('py-2') && /\bGIORNALIERO\b/i.test(el.innerText || ''))
          .sort((a, b) => (a.innerText || '').length - (b.innerText || '').length)[0];
        const target = box || document.body;
        if (!target) return [];

        const rawDaily = (target.innerText || '').split(/\bGIORNALIERO\b/i).slice(1).join('\n').split(/\nSERIE\b/i)[0];
        const lines = rawDaily
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !/^[1-3]$/.test(l) && !/^[▲▼]$/.test(l) && !/^GIOCA$/i.test(l) && !/^Ottieni premi/i.test(l));

        const out = [];
        let current = null;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const nextLine = lines[i + 1] || '';
          const looksLikeTitle =
            (!current && i === 0) ||
            (current &&
              current.descrizione &&
              line.length <= 90 &&
              !/[.!?]$/.test(line) &&
              (nextLine.length > line.length || /scheda|giocatore|partite|vinci|guadagna|earn|select|pick/i.test(nextLine)));

          if (looksLikeTitle) {
            if (current && current.titolo) {
              out.push({ titolo: current.titolo, descrizione: current.descrizione.trim() });
            }
            current = { titolo: line, descrizione: '' };
          } else if (current) {
            current.descrizione = current.descrizione ? `${current.descrizione} ${line}` : line;
          }
        }
        if (current && current.titolo) {
          out.push({ titolo: current.titolo, descrizione: current.descrizione.trim() });
        }
        return out;
      });
      missioni = Array.isArray(res) ? res : [];
    }

    const payload = {
      data: new Date().toISOString(),
      totale: missioni.length,
      stato: missioni.length > 0 ? 'ok' : (noMissions ? 'nessuna_missione_disponibile' : 'non_trovate'),
      missioni
    };

    const outPath = path.resolve(process.cwd(), 'missioni-oggi.json');
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log('JSON aggiornato: missioni-oggi.json (' + missioni.length + ' missioni, stato=' + payload.stato + ')');
    return payload;
  } finally {
    if (closeAfter && browser) {
      await browser.close().catch(() => {});
    }
  }
}

if (require.main === module) {
  estraiMissioni({ closeAfter: true })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('ERRORE:', err && err.message ? err.message : err);
      process.exitCode = 1;
    });
}

module.exports = { estraiMissioni };
