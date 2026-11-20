const puppeteer = require('puppeteer');
const fs = require('fs');

async function estraiMissioni() {
  const userDataDir =
    'C:/Users/fisio/OneDrive/Desktop/sorare-sessione';

  let browser;

  try {
    console.log('Apro Sorare...');

    browser = await puppeteer.launch({
      headless: false,
      userDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--start-maximized'
      ],
      defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    await page.goto(
      'https://sorare.com/it/football/play/missions/play/limited',
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    );

    console.log('Attendo le missioni giornaliere...');

    await page.waitForFunction(
      () => document.body &&
        document.body.innerText.includes('GIORNALIERO'),
      { timeout: 60000 }
    );

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Estraggo le missioni disponibili...');

    const risultato = await page.evaluate(() => {

      // Elenco completo dei possibili titoli di missioni giornaliere note
      const titoli = [
        'Decisive Picker',
        'Intercetto - Tutte le partite',
        'Assist - Tutte le partite',
        'Goal - Tutte le partite'
      ];

      const contenitori = [
        ...document.querySelectorAll('div')
      ].filter(el =>
        el.classList.contains('eAxlTh') &&
        el.classList.contains('py-2') &&
        el.innerText.includes('GIORNALIERO')
      ).sort((a, b) =>
        a.innerText.length - b.innerText.length
      );

      const contenitore = contenitori[0];

      if (!contenitore) {
        return {
          errore: 'Contenitore giornaliero non trovato',
          missioni: []
        };
      }

      const testo = contenitore.innerText;
      const trovate = [];

      // Cerca quali titoli sono effettivamente presenti nel testo della pagina oggi
      titoli.forEach(titolo => {
        const posizione = testo.indexOf(titolo);
        if (posizione !== -1) {
          trovate.unshift({ titolo, posizione });
        }
      });

      // Ordina le missioni trovate in base alla loro posizione reale nella pagina
      trovate.sort((a, b) => a.posizione - b.posizione);

      const missioniFinali = [];

      for (let i = 0; i < trovate.length; i++) {
        const corrente = trovate[i];
        const inizio = corrente.posizione + corrente.titolo.length;
        let fine = testo.length;

        if (i + 1 < trovate.length) {
          fine = trovate[i + 1].posizione;
        }

        let descrizione = testo
          .slice(inizio, fine)
          .trim();

        // Elimina eventuali sezioni successive alle missioni
        descrizione = descrizione
          .split(/\nSERIE\b/)[0]
          .trim();

        // Elimina i numeri isolati dei contatori
        descrizione = descrizione
          .replace(/\n[1-3](?=\n|$)/g, '')
          .trim();

        missioniFinali.push({
          titolo: corrente.titolo,
          descrizione
        });
      }

      return {
        errore: null,
        missioni: missioniFinali
      };
    });

    if (risultato.errore) {
      throw new Error(risultato.errore);
    }

    const missioni = risultato.missioni;

    const output = {
      data: new Date().toISOString(),
      totale: missioni.length,
      missioni
    };

    fs.writeFileSync(
      'missioni-oggi.json',
      JSON.stringify(output, null, 2),
      'utf8'
    );

    console.log('\n========== MISSIONI GIORNALIERE ==========\n');

    missioni.forEach((m, index) => {
      console.log(`${index + 1}. ${m.titolo}`);
      console.log(m.descrizione);
      console.log('');
    });

    console.log('==========================================');
    console.log(`TOTALE MISSIONI TROVATE: ${missioni.length}`);
    console.log('JSON aggiornato: missioni-oggi.json');
    console.log('ESTRAZIONE COMPLETATA CORRETTAMENTE!');
    console.log('Browser lasciato aperto.');

  } catch (error) {
    console.error('\nERRORE:', error.message);
  }
}

estraiMissioni();