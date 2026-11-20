require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const MISSIONS_FILE = path.join(__dirname, 'missioni-oggi.json');
const SALES_TRACKER_FILE = path.join(__dirname, 'sales-tracker.json');
const SORARE_API = 'https://api.sorare.com/graphql';
const SORARE_TOKEN_URL = process.env.SORARE_TOKEN_URL || 'https://api.sorare.com/oauth/token';

// Credenziali e configurazione OAuth da variabili d'ambiente
const SORARE_CLIENT_ID = process.env.SORARE_CLIENT_ID || '';
const SORARE_CLIENT_SECRET = process.env.SORARE_CLIENT_SECRET || '';
const SORARE_REDIRECT_URI = process.env.SORARE_REDIRECT_URI || '';

// Configurazione CORS tramite ALLOWED_ORIGINS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origine non consentita da CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

// -------------------------------------------------------------
// FUNZIONI COMUNI
// -------------------------------------------------------------

function sorareHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function sorareGraphQL(query, variables = {}, token = null) {
  const response = await fetch(SORARE_API, {
    method: 'POST',
    headers: sorareHeaders(token),
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.errors?.[0]?.message ||
      `Errore HTTP Sorare: ${response.status}`
    );
  }

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

function getNextGameWeekWindow(now = new Date()) {
  // Sorare Football Game Weeks run Tue -> Fri and Fri -> Tue (cutoff ~16:00 CET / 15:00 UTC)
  const current = new Date(now.getTime());
  const day = current.getUTCDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const hourUtc = current.getUTCHours();

  // Prima individua l'inizio della GW attualmente in corso/live
  const currentGwStartUtc = new Date(Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    current.getUTCDate(),
    15, 0, 0, 0
  ));

  if (day === 2) {
    if (hourUtc < 15) {
      currentGwStartUtc.setUTCDate(currentGwStartUtc.getUTCDate() - 4);
    }
  } else if (day === 3 || day === 4) {
    currentGwStartUtc.setUTCDate(currentGwStartUtc.getUTCDate() - (day - 2));
  } else if (day === 5) {
    if (hourUtc < 15) {
      currentGwStartUtc.setUTCDate(currentGwStartUtc.getUTCDate() - 3);
    }
  } else if (day === 6) {
    currentGwStartUtc.setUTCDate(currentGwStartUtc.getUTCDate() - 1);
  } else if (day === 0) {
    currentGwStartUtc.setUTCDate(currentGwStartUtc.getUTCDate() - 2);
  } else if (day === 1) {
    currentGwStartUtc.setUTCDate(currentGwStartUtc.getUTCDate() - 3);
  }

  const currentStartDay = currentGwStartUtc.getUTCDay();
  const currentCycleDays = currentStartDay === 2 ? 3 : 4; // Mar->Ven (3gg) o Ven->Mar (4gg)

  // La PROSSIMA Game Week inizia esattamente alla fine del ciclo della GW live
  const nextGwStartUtc = new Date(currentGwStartUtc.getTime());
  nextGwStartUtc.setUTCDate(nextGwStartUtc.getUTCDate() + currentCycleDays);
  nextGwStartUtc.setUTCHours(15, 0, 0, 0);

  const nextStartDay = nextGwStartUtc.getUTCDay();
  const nextCycleDays = nextStartDay === 2 ? 3 : 4;

  const nextGwEndUtc = new Date(nextGwStartUtc.getTime());
  nextGwEndUtc.setUTCDate(nextGwEndUtc.getUTCDate() + nextCycleDays);
  nextGwEndUtc.setUTCHours(23, 59, 59, 999);

  return {
    startMs: nextGwStartUtc.getTime(),
    endMs: nextGwEndUtc.getTime(),
    startIso: nextGwStartUtc.toISOString(),
    endIso: nextGwEndUtc.toISOString()
  };
}

function extractNextGameWeekInfo(activeClub, nextGwWindow) {
  const games = Array.isArray(activeClub?.upcomingGames) ? activeClub.upcomingGames : [];
  const clubSlug = String(activeClub?.slug || '').toLowerCase();
  const clubName = String(activeClub?.name || '').toLowerCase();

  const fallbackCompetition =
    activeClub?.domesticLeague?.displayName ||
    activeClub?.domesticLeague?.name ||
    activeClub?.country?.name ||
    '';

  for (const game of games) {
    if (!game || !game.date) continue;
    const gameMs = Date.parse(game.date);
    if (!Number.isFinite(gameMs)) continue;

    // Considera esclusivamente partite appartenenti alla PROSSIMA GW (mai alla GW live o già passate)
    const isInNextGw = gameMs >= nextGwWindow.startMs && gameMs <= nextGwWindow.endMs;
    if (!isInNextGw) continue;

    const homeSlug = String(game.homeTeam?.slug || '').toLowerCase();
    const homeName = String(game.homeTeam?.name || '').toLowerCase();

    const isHome =
      (clubSlug && homeSlug && clubSlug === homeSlug) ||
      (clubName && homeName && clubName === homeName);

    const opponent = isHome
      ? (game.awayTeam?.name || game.awayTeam?.slug || 'Avversario')
      : (game.homeTeam?.name || game.homeTeam?.slug || 'Avversario');

    const competition =
      game.competition?.displayName ||
      game.competition?.name ||
      game.competition?.slug ||
      fallbackCompetition;

    return {
      hasUpcomingGame: true,
      opponent,
      isHome,
      nextGameDate: game.date,
      competition,
      gameWeekWindow: `Next GW (${nextGwWindow.startIso.slice(0, 10)}..${nextGwWindow.endIso.slice(0, 10)})`
    };
  }

  return {
    hasUpcomingGame: false,
    opponent: null,
    isHome: false,
    nextGameDate: null,
    competition: fallbackCompetition,
    gameWeekWindow: `Next GW (${nextGwWindow.startIso.slice(0, 10)}..${nextGwWindow.endIso.slice(0, 10)})`
  };
}

function loadSalesTracker() {
  try {
    if (!fs.existsSync(SALES_TRACKER_FILE)) {
      return { users: {} };
    }
    const raw = fs.readFileSync(SALES_TRACKER_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.users
      ? parsed
      : { users: {} };
  } catch (error) {
    console.error('Errore lettura sales-tracker.json:', error);
    return { users: {} };
  }
}

function saveSalesTracker(trackerData) {
  try {
    fs.writeFileSync(SALES_TRACKER_FILE, JSON.stringify(trackerData, null, 2), 'utf8');
  } catch (error) {
    console.error('Errore salvataggio sales-tracker.json:', error);
  }
}

function getUserTracker(trackerData, userKey) {
  if (!trackerData.users[userKey]) {
    trackerData.users[userKey] = {
      initialized: false,
      cards: {}
    };
  }
  return trackerData.users[userKey];
}

// -------------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// CALLBACK OAUTH SORARE (SCAMBIO CODE -> ACCESS TOKEN)
// -------------------------------------------------------------

app.post('/api/auth/sorare/callback', async (req, res) => {
  const { code, redirectUri } = req.body || {};

  if (!code) {
    return res.status(400).json({
      error: 'Codice di autorizzazione mancante.'
    });
  }

  try {
    const params = new URLSearchParams({
      client_id: SORARE_CLIENT_ID,
      client_secret: SORARE_CLIENT_SECRET,
      code: String(code),
      grant_type: 'authorization_code',
      redirect_uri: redirectUri || SORARE_REDIRECT_URI
    });

    const tokenResponse = await fetch(SORARE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: params.toString()
    });

    const rawText = await tokenResponse.text();
    let tokenData = null;

    try {
      tokenData = JSON.parse(rawText);
    } catch {
      console.error(
        `Risposta non-JSON da Sorare (${SORARE_TOKEN_URL}) [HTTP ${tokenResponse.status}]:`,
        rawText.slice(0, 500)
      );
      return res.status(502).json({
        error: `Sorare ha risposto con formato non valido (HTTP ${tokenResponse.status}) invece di JSON.`
      });
    }

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(400).json({
        error:
          tokenData.error_description ||
          tokenData.error ||
          'Impossibile ottenere il token OAuth da Sorare.'
      });
    }

    const accessToken = tokenData.access_token;

    const userData = await sorareGraphQL(
      `
        query GetOAuthUser {
          currentUser {
            id
            nickname
            slug
          }
        }
      `,
      {},
      accessToken
    );

    const nickname = userData?.currentUser?.nickname || 'SorareUser';

    return res.json({
      success: true,
      token: accessToken,
      access_token: accessToken,
      nickname
    });
  } catch (error) {
    console.error('Errore callback OAuth Sorare:', error);
    return res.status(500).json({
      error: 'Errore durante l\'autenticazione Sorare: ' + error.message
    });
  }
});

// -------------------------------------------------------------
// LOGIN SORARE + 2FA (LEGACY)
// -------------------------------------------------------------

app.post('/api/login', async (req, res) => {
  const {
    username,
    password,
    otpCode,
    otpSessionChallenge
  } = req.body || {};

  try {
    if (otpCode && otpSessionChallenge) {
      const otpMutation = `
        mutation SignInOtpMutation($input: signInInput!) {
          signIn(input: $input) {
            currentUser {
              nickname
              slug
              email
            }
            jwtToken(aud: "sorare-pilot") {
              token
              expiredAt
            }
            errors {
              message
              code
            }
          }
        }
      `;

      const data = await sorareGraphQL(
        otpMutation,
        {
          input: {
            otpSessionChallenge,
            otpAttempt: String(otpCode).trim()
          }
        }
      );

      const signIn = data?.signIn;

      if (signIn?.errors?.length) {
        return res.status(401).json({
          error: signIn.errors[0].message
        });
      }

      if (!signIn?.currentUser || !signIn?.jwtToken?.token) {
        return res.status(401).json({
          error: 'Verifica 2FA fallita.'
        });
      }

      return res.json({
        success: true,
        nickname: signIn.currentUser.nickname,
        token: signIn.jwtToken.token
      });
    }

    if (!username || !password) {
      return res.status(400).json({
        error: 'Inserisci username/email e password.'
      });
    }

    const cleanUsername = String(username).trim();

    const saltResponse = await fetch(
      `https://api.sorare.com/api/v1/users/${encodeURIComponent(cleanUsername)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      }
    );

    if (!saltResponse.ok) {
      return res.status(401).json({
        error: 'Utente non trovato su Sorare.'
      });
    }

    const saltData = await saltResponse.json();

    if (!saltData.salt) {
      return res.status(401).json({
        error: 'Impossibile recuperare il sale di sicurezza.'
      });
    }

    const hashedPassword = bcrypt.hashSync(
      String(password),
      saltData.salt
    );

    const loginMutation = `
      mutation SignInMutation($input: signInInput!) {
        signIn(input: $input) {
          currentUser {
            nickname
            slug
            email
          }
          jwtToken(aud: "sorare-pilot") {
            token
            expiredAt
          }
          otpSessionChallenge
          errors {
            message
            code
          }
        }
      }
    `;

    const data = await sorareGraphQL(
      loginMutation,
      {
        input: {
          email: cleanUsername,
          password: hashedPassword
        }
      }
    );

    const signIn = data?.signIn;

    if (signIn?.otpSessionChallenge) {
      return res.json({
        requires2FA: true,
        otpSessionChallenge: signIn.otpSessionChallenge
      });
    }

    if (signIn?.errors?.length) {
      return res.status(401).json({
        error: signIn.errors[0].message
      });
    }

    if (!signIn?.currentUser || !signIn?.jwtToken?.token) {
      return res.status(401).json({
        error: 'Autenticazione fallita.'
      });
    }

    return res.json({
      success: true,
      nickname: signIn.currentUser.nickname,
      token: signIn.jwtToken.token
    });

  } catch (error) {
    console.error('Errore login:', error);

    return res.status(500).json({
      error: 'Errore durante il login: ' + error.message
    });
  }
});

// -------------------------------------------------------------
// LETTURA DELLE MISSIONI GIORNALIERE DAL JSON (FLESSIBILE)
// -------------------------------------------------------------

app.post('/api/fetch-missions', (req, res) => {
  try {
    console.log('📋 Lettura missioni giornaliere...');

    if (!fs.existsSync(MISSIONS_FILE)) {
      return res.status(404).json({
        success: false,
        error: 'File missioni-oggi.json non trovato.'
      });
    }

    const fileData = fs.readFileSync(MISSIONS_FILE, 'utf8');
    const parsedData = JSON.parse(fileData);

    if (!Array.isArray(parsedData.missioni)) {
      return res.status(400).json({
        success: false,
        error: 'Formato missioni-oggi.json non valido.'
      });
    }

    const dynamicMissions = parsedData.missioni
      .map((mission, index) => {
        let title = '';
        let description = '';
        let rawText = '';

        if (
          mission &&
          typeof mission === 'object' &&
          !Array.isArray(mission)
        ) {
          title = String(mission.titolo || '').trim();
          description = String(mission.descrizione || '').trim();
          rawText = `${title}\n${description}`;
        } else if (typeof mission === 'string') {
          const lines = mission
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

          title = lines[0] || '';
          description = lines.slice(1).join(' ');
          rawText = mission;
        }

        if (!title || !description) {
          return null;
        }

        const normalizedTitle = title.toLowerCase();
        let type = 'DECISIVE';

        if (normalizedTitle.includes('intercetto')) {
          type = 'INTERCEPTIONS';
        } else if (normalizedTitle.includes('assist')) {
          type = 'ASSISTS';
        } else if (normalizedTitle.includes('gol')) {
          type = 'GOALS';
        } else if (normalizedTitle.includes('passaggio')) {
          type = 'PASSES';
        }

        return {
          id: `mission-${index + 1}`,
          title,
          type,
          description,
          reward: 'Premio Giornaliero Sorare',
          requiredCount: 3,
          selectedCards: [null, null, null],
          completed: false,
          rawText
        };
      })
      .filter(Boolean);

    console.log(`✅ Missioni caricate correttamente: ${dynamicMissions.length}`);

    return res.json({
      success: true,
      missions: dynamicMissions,
      total: dynamicMissions.length,
      date: parsedData.data || null
    });

  } catch (error) {
    console.error('❌ Errore recupero missioni:', error);

    return res.status(500).json({
      success: false,
      error: 'Errore durante il recupero delle missioni: ' + error.message
    });
  }
});

// -------------------------------------------------------------
// SINCRONIZZAZIONE CARTE UTENTE (NEXT GW + COMPETIZIONE + ETA + RIENTRI VENDITA)
// -------------------------------------------------------------

app.post('/api/user-cards', async (req, res) => {
  const { token, after = null } = req.body || {};

  if (!token) {
    return res.status(400).json({
      error: 'Token di autenticazione mancante.'
    });
  }

  try {
    const cardsQueryFull = `
      query GetCurrentUserData($after: String) {
        currentUser {
          id
          nickname
          slug
          cards(after: $after, first: 50) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              slug
              rarityTyped
              serialNumber
              pictureUrl
              name
              sealed
              liveSingleSaleOffer {
                id
                startDate
                endDate
              }
              ... on Card {
                player {
                  id
                  slug
                  displayName
                  position
                  age
                  dateOfBirth
                  activeClub {
                    slug
                    name
                    pictureUrl
                    country {
                      name
                    }
                    domesticLeague {
                      slug
                      name
                      displayName
                    }
                    upcomingGames(first: 5) {
                      id
                      date
                      competition {
                        slug
                        name
                        displayName
                      }
                      homeTeam {
                        ... on Club {
                          slug
                          name
                        }
                      }
                      awayTeam {
                        ... on Club {
                          slug
                          name
                        }
                      }
                    }
                  }
                  so5Scores(last: 10) {
                    score
                  }
                }
              }
            }
          }
        }
      }
    `;
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const MISSIONS_FILE = path.join(__dirname, 'missioni-oggi.json');
const SALES_TRACKER_FILE = path.join(__dirname, 'sales-tracker.json');
const SORARE_API = 'https://api.sorare.com/graphql';
const SORARE_TOKEN_URL = process.env.SORARE_TOKEN_URL || 'https://api.sorare.com/oauth/token';

// Credenziali e configurazione OAuth da variabili d'ambiente
const SORARE_CLIENT_ID = process.env.SORARE_CLIENT_ID || '';
const SORARE_CLIENT_SECRET = process.env.SORARE_CLIENT_SECRET || '';
const SORARE_REDIRECT_URI = process.env.SORARE_REDIRECT_URI || '';

// Configurazione CORS tramite ALLOWED_ORIGINS (es. "https://tuo-frontend.vercel.app,http://localhost:5173")
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Consente richieste senza origin (es. curl, healthcheck, server-to-server) o se ALLOWED_ORIGINS non è configurata
    if (!origin || allowedOrigins.length === 0) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origine non consentita da CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

// -------------------------------------------------------------
// FUNZIONI COMUNI
// -------------------------------------------------------------

function sorareHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function sorareGraphQL(query, variables = {}, token = null) {
  const response = await fetch(SORARE_API, {
    method: 'POST',
    headers: sorareHeaders(token),
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.errors?.[0]?.message ||
      `Errore HTTP Sorare: ${response.status}`
    );
  }

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

function getNextGameWeekWindow(now = new Date()) {
  // Sorare Football Game Weeks run Tue -> Fri and Fri -> Tue (cutoff ~16:00 CET / 15:00 UTC)
  const current = new Date(now.getTime());
  const day = current.getUTCDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const hourUtc = current.getUTCHours();

  // Prima individua l'inizio della GW attualmente in corso/live
  const currentGwStartUtc = new Date(Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    current.getUTCDate(),
    15, 0, 0, 0
  ));

  if (day === 2) {
    if (hourUtc < 15) {
      currentGwStartUtc.setUTCDate(currentGwStartUtc.getUTCDate() - 4);
    }
  } else if (day === 3 || day === 4) {
    currentGwStartUtc.setUTCDate(currentGwStartUtc.getUTCDate() - (day - 2));
  } else if (day === 5) {
    if (hourUtc < 15) {
      currentGwStartUtc.setUTCDate(currentGwStartUtc.getUTCDate() - 3);
    }
  } else if (day === 6) {
    currentGwStartUtc.setUTCDate(currentGwStartUtc.getUTCDate() - 1);
  } else if (day === 0) {
    currentGwStartUtc.setUTCDate(currentGwStartUtc.getUTCDate() - 2);
  } else if (day === 1) {
    currentGwStartUtc.setUTCDate(currentGwStartUtc.getUTCDate() - 3);
  }

  const currentStartDay = currentGwStartUtc.getUTCDay();
  const currentCycleDays = currentStartDay === 2 ? 3 : 4; // Mar->Ven (3gg) o Ven->Mar (4gg)

  // La PROSSIMA Game Week inizia esattamente alla fine del ciclo della GW live
  const nextGwStartUtc = new Date(currentGwStartUtc.getTime());
  nextGwStartUtc.setUTCDate(nextGwStartUtc.getUTCDate() + currentCycleDays);
  nextGwStartUtc.setUTCHours(15, 0, 0, 0);

  const nextStartDay = nextGwStartUtc.getUTCDay();
  const nextCycleDays = nextStartDay === 2 ? 3 : 4;

  const nextGwEndUtc = new Date(nextGwStartUtc.getTime());
  nextGwEndUtc.setUTCDate(nextGwEndUtc.getUTCDate() + nextCycleDays);
  nextGwEndUtc.setUTCHours(23, 59, 59, 999);

  return {
    startMs: nextGwStartUtc.getTime(),
    endMs: nextGwEndUtc.getTime(),
    startIso: nextGwStartUtc.toISOString(),
    endIso: nextGwEndUtc.toISOString()
  };
}

function extractNextGameWeekInfo(activeClub, nextGwWindow) {
  const games = Array.isArray(activeClub?.upcomingGames) ? activeClub.upcomingGames : [];
  const clubSlug = String(activeClub?.slug || '').toLowerCase();
  const clubName = String(activeClub?.name || '').toLowerCase();

  const fallbackCompetition =
    activeClub?.domesticLeague?.displayName ||
    activeClub?.domesticLeague?.name ||
    activeClub?.country?.name ||
    '';

  for (const game of games) {
    if (!game || !game.date) continue;
    const gameMs = Date.parse(game.date);
    if (!Number.isFinite(gameMs)) continue;

    // Considera esclusivamente partite appartenenti alla PROSSIMA GW (mai alla GW live o già passate)
    const isInNextGw = gameMs >= nextGwWindow.startMs && gameMs <= nextGwWindow.endMs;
    if (!isInNextGw) continue;

    const homeSlug = String(game.homeTeam?.slug || '').toLowerCase();
    const homeName = String(game.homeTeam?.name || '').toLowerCase();

    const isHome =
      (clubSlug && homeSlug && clubSlug === homeSlug) ||
      (clubName && homeName && clubName === homeName);

    const opponent = isHome
      ? (game.awayTeam?.name || game.awayTeam?.slug || 'Avversario')
      : (game.homeTeam?.name || game.homeTeam?.slug || 'Avversario');

    const competition =
      game.competition?.displayName ||
      game.competition?.name ||
      game.competition?.slug ||
      fallbackCompetition;

    return {
      hasUpcomingGame: true,
      opponent,
      isHome,
      nextGameDate: game.date,
      competition,
      gameWeekWindow: `Next GW (${nextGwWindow.startIso.slice(0, 10)}..${nextGwWindow.endIso.slice(0, 10)})`
    };
  }

  return {
    hasUpcomingGame: false,
    opponent: null,
    isHome: false,
    nextGameDate: null,
    competition: fallbackCompetition,
    gameWeekWindow: `Next GW (${nextGwWindow.startIso.slice(0, 10)}..${nextGwWindow.endIso.slice(0, 10)})`
  };
}

function loadSalesTracker() {
  try {
    if (!fs.existsSync(SALES_TRACKER_FILE)) {
      return { users: {} };
    }
    const raw = fs.readFileSync(SALES_TRACKER_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.users
      ? parsed
      : { users: {} };
  } catch (error) {
    console.error('Errore lettura sales-tracker.json:', error);
    return { users: {} };
  }
}

function saveSalesTracker(trackerData) {
  try {
    fs.writeFileSync(SALES_TRACKER_FILE, JSON.stringify(trackerData, null, 2), 'utf8');
  } catch (error) {
    console.error('Errore salvataggio sales-tracker.json:', error);
  }
}

function getUserTracker(trackerData, userKey) {
  if (!trackerData.users[userKey]) {
    trackerData.users[userKey] = {
      initialized: false,
      cards: {}
    };
  }
  return trackerData.users[userKey];
}

// -------------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// CALLBACK OAUTH SORARE (SCAMBIO CODE -> ACCESS TOKEN)
// -------------------------------------------------------------

app.post('/api/auth/sorare/callback', async (req, res) => {
  const { code, redirectUri } = req.body || {};

  if (!code) {
    return res.status(400).json({
      error: 'Codice di autorizzazione mancante.'
    });
  }

  const effectiveRedirectUri = redirectUri || SORARE_REDIRECT_URI;

  if (!SORARE_CLIENT_ID || !SORARE_CLIENT_SECRET || !effectiveRedirectUri) {
    return res.status(500).json({
      error: 'Configurazione OAuth Sorare incompleta sul server (SORARE_CLIENT_ID, SORARE_CLIENT_SECRET, SORARE_REDIRECT_URI).'
    });
  }

  try {
    const params = new URLSearchParams({
      client_id: SORARE_CLIENT_ID,
      client_secret: SORARE_CLIENT_SECRET,
      code: String(code),
      grant_type: 'authorization_code',
      redirect_uri: effectiveRedirectUri
    });

    const tokenResponse = await fetch(SORARE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: params.toString()
    });

    const rawText = await tokenResponse.text();
    let tokenData = null;

    try {
      tokenData = JSON.parse(rawText);
    } catch {
      console.error(
        `Risposta non-JSON da Sorare (${SORARE_TOKEN_URL}) [HTTP ${tokenResponse.status}]:`,
        rawText.slice(0, 500)
      );
      return res.status(502).json({
        error: `Sorare ha risposto con formato non valido (HTTP ${tokenResponse.status}) invece di JSON.`
      });
    }

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(400).json({
        error:
          tokenData.error_description ||
          tokenData.error ||
          'Impossibile ottenere il token OAuth da Sorare.'
      });
    }

    const accessToken = tokenData.access_token;

    const userData = await sorareGraphQL(
      `
        query GetOAuthUser {
          currentUser {
            id
            nickname
            slug
          }
        }
      `,
      {},
      accessToken
    );

    const nickname = userData?.currentUser?.nickname || 'SorareUser';

    return res.json({
      success: true,
      token: accessToken,
      access_token: accessToken,
      nickname
    });
  } catch (error) {
    console.error('Errore callback OAuth Sorare:', error);
    return res.status(500).json({
      error: 'Errore durante l\'autenticazione Sorare: ' + error.message
    });
  }
});

// -------------------------------------------------------------
// LOGIN SORARE + 2FA (LEGACY)
// -------------------------------------------------------------

app.post('/api/login', async (req, res) => {
  const {
    username,
    password,
    otpCode,
    otpSessionChallenge
  } = req.body || {};

  try {
    if (otpCode && otpSessionChallenge) {
      const otpMutation = `
        mutation SignInOtpMutation($input: signInInput!) {
          signIn(input: $input) {
            currentUser {
              nickname
              slug
              email
            }
            jwtToken(aud: "sorare-pilot") {
              token
              expiredAt
            }
            errors {
              message
              code
            }
          }
        }
      `;

      const data = await sorareGraphQL(
        otpMutation,
        {
          input: {
            otpSessionChallenge,
            otpAttempt: String(otpCode).trim()
          }
        }
      );

      const signIn = data?.signIn;

      if (signIn?.errors?.length) {
        return res.status(401).json({
          error: signIn.errors[0].message
        });
      }

      if (!signIn?.currentUser || !signIn?.jwtToken?.token) {
        return res.status(401).json({
          error: 'Verifica 2FA fallita.'
        });
      }

      return res.json({
        success: true,
        nickname: signIn.currentUser.nickname,
        token: signIn.jwtToken.token
      });
    }

    if (!username || !password) {
      return res.status(400).json({
        error: 'Inserisci username/email e password.'
      });
    }

    const cleanUsername = String(username).trim();

    const saltResponse = await fetch(
      `https://api.sorare.com/api/v1/users/${encodeURIComponent(cleanUsername)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      }
    );

    if (!saltResponse.ok) {
      return res.status(401).json({
        error: 'Utente non trovato su Sorare.'
      });
    }

    const saltData = await saltResponse.json();

    if (!saltData.salt) {
      return res.status(401).json({
        error: 'Impossibile recuperare il sale di sicurezza.'
      });
    }

    const hashedPassword = bcrypt.hashSync(
      String(password),
      saltData.salt
    );

    const loginMutation = `
      mutation SignInMutation($input: signInInput!) {
        signIn(input: $input) {
          currentUser {
            nickname
            slug
            email
          }
          jwtToken(aud: "sorare-pilot") {
            token
            expiredAt
          }
          otpSessionChallenge
          errors {
            message
            code
          }
        }
      }
    `;

    const data = await sorareGraphQL(
      loginMutation,
      {
        input: {
          email: cleanUsername,
          password: hashedPassword
        }
      }
    );

    const signIn = data?.signIn;

    if (signIn?.otpSessionChallenge) {
      return res.json({
        requires2FA: true,
        otpSessionChallenge: signIn.otpSessionChallenge
      });
    }

    if (signIn?.errors?.length) {
      return res.status(401).json({
        error: signIn.errors[0].message
      });
    }

    if (!signIn?.currentUser || !signIn?.jwtToken?.token) {
      return res.status(401).json({
        error: 'Autenticazione fallita.'
      });
    }

    return res.json({
      success: true,
      nickname: signIn.currentUser.nickname,
      token: signIn.jwtToken.token
    });

  } catch (error) {
    console.error('Errore login:', error);

    return res.status(500).json({
      error: 'Errore durante il login: ' + error.message
    });
  }
});

// -------------------------------------------------------------
// LETTURA DELLE MISSIONI GIORNALIERE DAL JSON (FLESSIBILE)
// -------------------------------------------------------------

app.post('/api/fetch-missions', (req, res) => {
  try {
    console.log('📋 Lettura missioni giornaliere...');

    if (!fs.existsSync(MISSIONS_FILE)) {
      return res.status(404).json({
        success: false,
        error: 'File missioni-oggi.json non trovato.'
      });
    }

    const fileData = fs.readFileSync(MISSIONS_FILE, 'utf8');
    const parsedData = JSON.parse(fileData);

    if (!Array.isArray(parsedData.missioni)) {
      return res.status(400).json({
        success: false,
        error: 'Formato missioni-oggi.json non valido.'
      });
    }

    const dynamicMissions = parsedData.missioni
      .map((mission, index) => {
        let title = '';
        let description = '';
        let rawText = '';

        if (
          mission &&
          typeof mission === 'object' &&
          !Array.isArray(mission)
        ) {
          title = String(mission.titolo || '').trim();
          description = String(mission.descrizione || '').trim();
          rawText = `${title}\n${description}`;
        } else if (typeof mission === 'string') {
          const lines = mission
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

          title = lines[0] || '';
          description = lines.slice(1).join(' ');
          rawText = mission;
        }

        if (!title || !description) {
          return null;
        }

        const normalizedTitle = title.toLowerCase();
        let type = 'DECISIVE';

        if (normalizedTitle.includes('intercetto')) {
          type = 'INTERCEPTIONS';
        } else if (normalizedTitle.includes('assist')) {
          type = 'ASSISTS';
        } else if (normalizedTitle.includes('gol')) {
          type = 'GOALS';
        } else if (normalizedTitle.includes('passaggio')) {
          type = 'PASSES';
        }

        return {
          id: `mission-${index + 1}`,
          title,
          type,
          description,
          reward: 'Premio Giornaliero Sorare',
          requiredCount: 3,
          selectedCards: [null, null, null],
          completed: false,
          rawText
        };
      })
      .filter(Boolean);

    console.log(`✅ Missioni caricate correttamente: ${dynamicMissions.length}`);

    return res.json({
      success: true,
      missions: dynamicMissions,
      total: dynamicMissions.length,
      date: parsedData.data || null
    });

  } catch (error) {
    console.error('❌ Errore recupero missioni:', error);

    return res.status(500).json({
      success: false,
      error: 'Errore durante il recupero delle missioni: ' + error.message
    });
  }
});

// -------------------------------------------------------------
// SINCRONIZZAZIONE CARTE UTENTE (NEXT GW + COMPETIZIONE + ETA + RIENTRI VENDITA)
// -------------------------------------------------------------

app.post('/api/user-cards', async (req, res) => {
  const { token, after = null } = req.body || {};

  if (!token) {
    return res.status(400).json({
      error: 'Token di autenticazione mancante.'
    });
  }

  try {
    const cardsQueryFull = `
      query GetCurrentUserData($after: String) {
        currentUser {
          id
          nickname
          slug
          cards(after: $after, first: 50) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              slug
              rarityTyped
              serialNumber
              pictureUrl
              name
              sealed
              liveSingleSaleOffer {
                id
                startDate
                endDate
              }
              ... on Card {
                player {
                  id
                  slug
                  displayName
                  position
                  age
                  dateOfBirth
                  activeClub {
                    slug
                    name
                    pictureUrl
                    country {
                      name
                    }
                    domesticLeague {
                      slug
                      name
                      displayName
                    }
                    upcomingGames(first: 5) {
                      id
                      date
                      competition {
                        slug
                        name
                        displayName
                      }
                      homeTeam {
                        ... on Club {
                          slug
                          name
                        }
                      }
                      awayTeam {
                        ... on Club {
                          slug
                          name
                        }
                      }
                    }
                  }
                  so5Scores(last: 10) {
                    score
                  }
                }
              }
            }
          }
        }
      }
    `;

    const cardsQueryWithGames = `
      query GetCurrentUserDataWithGames($after: String) {
        currentUser {
          id
          nickname
          slug
          cards(after: $after, first: 50) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              slug
              rarityTyped
              serialNumber
              pictureUrl
              name
              sealed
              liveSingleSaleOffer {
                id
                startDate
                endDate
              }
              ... on Card {
                player {
                  id
                  slug
                  displayName
                  position
                  activeClub {
                    slug
                    name
                    pictureUrl
                    upcomingGames(first: 5) {
                      id
                      date
                      homeTeam {
                        ... on Club {
                          slug
                          name
                        }
                      }
                      awayTeam {
                        ... on Club {
                          slug
                          name
                        }
                      }
                    }
                  }
                  so5Scores(last: 10) {
                    score
                  }
                }
              }
            }
          }
        }
      }
    `;

    const cardsQueryFallback = `
      query GetCurrentUserDataFallback($after: String) {
        currentUser {
          id
          nickname
          slug
          cards(after: $after, first: 50) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              slug
              rarityTyped
              serialNumber
              pictureUrl
              name
              sealed
              liveSingleSaleOffer {
                id
                startDate
                endDate
              }
              ... on Card {
                player {
                  id
                  slug
                  displayName
                  position
                  activeClub {
                    slug
                    name
                    pictureUrl
                  }
                  so5Scores(last: 10) {
                    score
                  }
                }
              }
            }
          }
        }
      }
    `;

    let data;
    try {
      data = await sorareGraphQL(cardsQueryFull, { after }, token);
    } catch {
      try {
        data = await sorareGraphQL(cardsQueryWithGames, { after }, token);
      } catch {
        data = await sorareGraphQL(cardsQueryFallback, { after }, token);
      }
    }

    const currentUser = data?.currentUser;

    if (!currentUser) {
      return res.status(404).json({
        error: 'Profilo Sorare non trovato.'
      });
    }

    const cardsData = currentUser.cards;
    const cardNodes = cardsData?.nodes || [];
    const nextGwWindow = getNextGameWeekWindow();

    const userKey = currentUser.slug || currentUser.id || currentUser.nickname || 'default';
    const trackerData = loadSalesTracker();
    const userTracker = getUserTracker(trackerData, userKey);
    const isInitialBaseline = !userTracker.initialized;

    const formattedCards = cardNodes.map(card => {
      let position = 'Forward';

      const rawPosition = (
        card.player?.position || ''
      ).toLowerCase();

      if (rawPosition.includes('goal')) {
        position = 'Goalkeeper';
      } else if (rawPosition.includes('def')) {
        position = 'Defender';
      } else if (rawPosition.includes('mid')) {
        position = 'Midfielder';
      }

      const isSealed = Boolean(card.sealed);
      const currentOfferId = card.liveSingleSaleOffer?.id || null;
      const isListed = Boolean(currentOfferId);
      const isInVault = Boolean(isSealed || card.locked || card.inVault);
      const isOnSale = Boolean(isListed || card.onSale || card.isOnSale);
      const isInOtherLineup = Boolean(
        card.inLineup ||
        card.isInLineup ||
        card.usedInLineup ||
        (Array.isArray(card.lineups) && card.lineups.length > 0)
      );
      const canPlayLineup = !isInVault && !isOnSale && !isInOtherLineup;

      let computedDurationDays = 7;
      if (card.liveSingleSaleOffer?.startDate && card.liveSingleSaleOffer?.endDate) {
        const startMs = Date.parse(card.liveSingleSaleOffer.startDate);
        const endMs = Date.parse(card.liveSingleSaleOffer.endDate);
        if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
          computedDurationDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
        }
      }

      const cardKey = card.id || card.slug;
      const prevRecord = userTracker.cards[cardKey] || {
        activeOfferId: null,
        returnedFromSale: false,
        returnedAt: null,
        autoRelisted: false,
        lastPriceEur: 0,
        lastDurationDays: 7
      };

      let returnedFromSale = prevRecord.returnedFromSale;
      let returnedAt = prevRecord.returnedAt;
      let autoRelisted = Boolean(prevRecord.autoRelisted);

      if (isInitialBaseline) {
        returnedFromSale = false;
        returnedAt = null;
        autoRelisted = false;
      } else if (isListed) {
        returnedFromSale = false;
        returnedAt = null;
        autoRelisted = false;
      } else if (!isListed && prevRecord.activeOfferId) {
        returnedFromSale = true;
        returnedAt = prevRecord.returnedAt || new Date().toISOString();
        autoRelisted = false;
      }

      const lastPriceEur = Number(prevRecord.lastPriceEur || 0) || 0;
      const lastDurationDays = isListed
        ? computedDurationDays
        : (Number(prevRecord.lastDurationDays || computedDurationDays || 7) || 7);

      userTracker.cards[cardKey] = {
        activeOfferId: currentOfferId,
        returnedFromSale,
        returnedAt,
        autoRelisted,
        lastPriceEur,
        lastDurationDays
      };

      let listingStatus = 'NONE';
      if (isListed) {
        listingStatus = 'ACTIVE';
      } else if (returnedFromSale) {
        listingStatus = 'RETURNED';
      }

      const scoresArray = card.player?.so5Scores || [];
      const validScores = scoresArray
        .map(s => (typeof s === 'object' && s !== null ? s.score : s))
        .filter(s => typeof s === 'number' && !isNaN(s) && s !== null);

      const last5 = validScores.slice(-5);
      const l5Average = last5.length > 0
        ? Math.round(last5.reduce((a, b) => a + b, 0) / last5.length)
        : 0;

      const last10 = validScores.slice(-10);
      const l10Average = last10.length > 0
        ? Math.round(last10.reduce((a, b) => a + b, 0) / last10.length)
        : 0;

      const gameInfo = extractNextGameWeekInfo(card.player?.activeClub, nextGwWindow);

      return {
        id: card.id,
        name:
          card.player?.displayName ||
          card.name ||
          card.slug ||
          'Giocatore',
        position,
        rarity: card.rarityTyped || 'LIMITED',
        team: card.player?.activeClub?.name || 'Squadra',
        l10Average,
        l5Average,
        priceEur: lastPriceEur,
        xpBonus: 0,
        isAvailable: canPlayLineup,
        canPlayLineup,
        isInVault,
        isOnSale,
        isInOtherLineup,
        hasUpcomingGame: gameInfo.hasUpcomingGame,
        gameWeek: gameInfo.gameWeekWindow,
        nextGameDate: gameInfo.nextGameDate,
        competition: gameInfo.competition,
        opponent: gameInfo.opponent,
        isHome: gameInfo.isHome,
        pictureUrl:
          card.pictureUrl ||
          card.player?.activeClub?.pictureUrl ||
          'https://images.sorare.com/cards/default.png',
        slug: card.slug,
        serialNumber: card.serialNumber,
        listingStatus,
        returnedFromSale,
        returnedAt,
        autoRelisted,
        lastPriceEur,
        lastDurationDays,
        askingPrice: lastPriceEur,
        player: card.player ? {
          id: card.player.id,
          slug: card.player.slug,
          displayName: card.player.displayName,
          position: card.player.position,
          age: card.player.age,
          birthDate: card.player.dateOfBirth,
          activeClub: card.player.activeClub ? {
            name: card.player.activeClub.name,
            pictureUrl: card.player.activeClub.pictureUrl
          } : undefined
        } : undefined
      };
    });

    if (isInitialBaseline) {
      userTracker.initialized = true;
    }

    saveSalesTracker(trackerData);

    return res.json({
      nickname: currentUser.nickname,
      nextGameWeekWindow: {
        start: nextGwWindow.startIso,
        end: nextGwWindow.endIso
      },
      cards: formattedCards,
      pageInfo: {
        hasNextPage: cardsData?.pageInfo?.hasNextPage || false,
        endCursor: cardsData?.pageInfo?.endCursor || null
      }
    });

  } catch (error) {
    console.error('Errore user-cards:', error);

    return res.status(500).json({
      error: 'Errore sincronizzazione carte: ' + error.message
    });
  }
});

// -------------------------------------------------------------
// RIMESSA IN VENDITA AUTOMATICA (AUTO-SELL)
// -------------------------------------------------------------

app.post('/api/autosell-relist', async (req, res) => {
  const { token, relists = [] } = req.body || {};

  if (!token) {
    return res.status(401).json({
      error: 'Token di autenticazione mancante.'
    });
  }

  try {
    const userData = await sorareGraphQL(
      `
        query GetCurrentUserForRelist {
          currentUser {
            id
            slug
            nickname
          }
        }
      `,
      {},
      token
    );

    const currentUser = userData?.currentUser;
    if (!currentUser) {
      return res.status(404).json({
        error: 'Profilo Sorare non trovato.'
      });
    }

    const userKey = currentUser.slug || currentUser.id || currentUser.nickname || 'default';
    const trackerData = loadSalesTracker();
    const userTracker = getUserTracker(trackerData, userKey);

    const processedIds = [];

    for (const item of relists) {
      const cardId = String(item.cardId || '');
      if (!cardId) continue;

      const tracked = userTracker.cards[cardId] || {};
      const priceEur = Number(item.priceEur ?? tracked.lastPriceEur ?? 0) || 0;
      const durationDays = Number(item.durationDays ?? tracked.lastDurationDays ?? 7) || 7;

      console.log(`[AUTO-SELL] Card ${cardId} -> prezzo €${priceEur}, durata ${durationDays}gg`);

      if (userTracker.cards[cardId]) {
        userTracker.cards[cardId].autoRelisted = true;
        userTracker.cards[cardId].returnedFromSale = false;
        userTracker.cards[cardId].lastPriceEur = priceEur;
        userTracker.cards[cardId].lastDurationDays = durationDays;
      }

      processedIds.push(cardId);
    }

    saveSalesTracker(trackerData);

    return res.json({
      success: true,
      processedIds,
      count: processedIds.length
    });
  } catch (error) {
    console.error('Errore autosell-relist:', error);
    return res.status(500).json({
      error: 'Errore rimessa in vendita automatica: ' + error.message
    });
  }
});

// -------------------------------------------------------------
// PULIZIA CARTE TORNATE DALLA VENDITA (OPZIONALE PER UI VENDITE)
// -------------------------------------------------------------

app.post('/api/sales/clear-returned', async (req, res) => {
  const { token, cardIds = null } = req.body || {};

  if (!token) {
    return res.status(400).json({
      error: 'Token di autenticazione mancante.'
    });
  }

  try {
    const userData = await sorareGraphQL(
      `
        query GetCurrentUserSlug {
          currentUser {
            id
            slug
            nickname
          }
        }
      `,
      {},
      token
    );

    const currentUser = userData?.currentUser;
    if (!currentUser) {
      return res.status(404).json({
        error: 'Profilo Sorare non trovato.'
      });
    }

    const userKey = currentUser.slug || currentUser.id || currentUser.nickname || 'default';
    const trackerData = loadSalesTracker();
    const userTracker = getUserTracker(trackerData, userKey);

    const targetIds = Array.isArray(cardIds) && cardIds.length > 0
      ? new Set(cardIds.map(String))
      : null;

    Object.keys(userTracker.cards).forEach(cardKey => {
      if (!targetIds || targetIds.has(String(cardKey))) {
        userTracker.cards[cardKey].returnedFromSale = false;
        userTracker.cards[cardKey].returnedAt = null;
        userTracker.cards[cardKey].autoRelisted = false;
      }
    });

    saveSalesTracker(trackerData);

    return res.json({
      success: true,
      message: 'Elenco carte tornate aggiornato.'
    });
  } catch (error) {
    console.error('Errore clear-returned:', error);
    return res.status(500).json({
      error: 'Errore pulizia carte tornate: ' + error.message
    });
  }
});

// -------------------------------------------------------------
// INVIO FORMAZIONI / MISSIONI
// -------------------------------------------------------------

app.post('/api/submit-missions', async (req, res) => {
  const { token, submissions } = req.body || {};

  if (!token) {
    return res.status(401).json({
      error: 'Token di autenticazione mancante.'
    });
  }

  if (!Array.isArray(submissions) || submissions.length === 0) {
    return res.status(400).json({
      error: 'Nessuna missione da inviare.'
    });
  }

  const invalidSubmission = submissions.some(sub => {
    const missionId = sub.missionId || sub.taskId;
    const cards = sub.selectedCards || sub.cardIds;

    return (
      !missionId ||
      !Array.isArray(cards) ||
      cards.filter(Boolean).length === 0
    );
  });

  if (invalidSubmission) {
    return res.status(400).json({
      error: 'Una o più missioni contengono dati non validi.'
    });
  }

  try {
    const results = [];

    const submitMutation = `
      mutation SubmitMission($input: createLineUpInput!) {
        createLineUp(input: $input) {
          lineUp {
            id
          }
          errors {
            message
            code
          }
        }
      }
    `;

    for (const sub of submissions) {
      const missionId = sub.missionId || sub.taskId;
      const selectedCardIds = (sub.selectedCards || sub.cardIds).filter(Boolean);

      try {
        const data = await sorareGraphQL(
          submitMutation,
          {
            input: {
              cardIds: selectedCardIds,
              gameId: missionId
            }
          },
          token
        );

        const result = data?.createLineUp;

        if (result?.errors?.length) {
          results.push({
            missionId,
            status: 'ERROR',
            message: result.errors[0].message
          });
        } else if (result?.lineUp?.id) {
          results.push({
            missionId,
            status: 'SUCCESS',
            message: 'Formazione inviata.'
          });
        } else {
          results.push({
            missionId,
            status: 'ERROR',
            message: 'Risposta Sorare non valida.'
          });
        }

      } catch (error) {
        results.push({
          missionId,
          status: 'ERROR',
          message: error.message
        });
      }
    }

    const allSuccess = results.every(result => result.status === 'SUCCESS');

    return res.json({
      success: allSuccess,
      message: allSuccess ? 'Missioni inviate con successo!' : 'Elaborazione completata con errori.',
      results
    });

  } catch (error) {
    console.error('Errore invio missioni:', error);

    return res.status(500).json({
      error: 'Errore invio missioni: ' + error.message
    });
  }
});

// -------------------------------------------------------------
// AVVIO SERVER
// -------------------------------------------------------------

app.listen(PORT, () => {
  console.log('======================================');
  console.log('🚀 SERVER SORAREPILOT ATTIVO');
  console.log(`🌐 Porta: ${PORT}`);
  console.log(`📁 Missioni: ${MISSIONS_FILE}`);
  console.log(`📁 Tracker vendite: ${SALES_TRACKER_FILE}`);
  console.log('======================================');
});