require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const MISSIONS_FILE = path.join(__dirname, 'missioni-oggi.json');
const SALES_TRACKER_FILE = path.join(__dirname, 'sales-tracker.json');
const DIST_DIR = path.join(__dirname, 'dist');
const SORARE_API = process.env.SORARE_API_URL || 'https://api.sorare.com/graphql';
const SORARE_TOKEN_URL = process.env.SORARE_TOKEN_URL || 'https://api.sorare.com/oauth/token';

// Credenziali e configurazione OAuth da variabili d'ambiente
const SORARE_CLIENT_ID = process.env.SORARE_CLIENT_ID || '';
const SORARE_CLIENT_SECRET = process.env.SORARE_CLIENT_SECRET || '';
const SORARE_REDIRECT_URI = process.env.SORARE_REDIRECT_URI || '';

// Parametri di scalabilità e cache configurabili via env
const SORARE_MAX_CONCURRENCY = Math.max(1, Number(process.env.SORARE_MAX_CONCURRENCY) || 6);
const SORARE_REQUEST_TIMEOUT_MS = Math.max(2000, Number(process.env.SORARE_REQUEST_TIMEOUT_MS) || 12000);
const USER_PROFILE_CACHE_TTL_MS = Math.max(5000, Number(process.env.USER_PROFILE_CACHE_TTL_MS) || 30000);
const USER_CARDS_CACHE_TTL_MS = Math.max(5000, Number(process.env.USER_CARDS_CACHE_TTL_MS) || 20000);
const MISSIONS_CACHE_TTL_MS = Math.max(5000, Number(process.env.MISSIONS_CACHE_TTL_MS) || 30000);
const API_RATE_LIMIT_WINDOW_MS = Math.max(1000, Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 60000);
const API_RATE_LIMIT_MAX = Math.max(10, Number(process.env.API_RATE_LIMIT_MAX) || 120);
const MAX_CACHE_ENTRIES = Math.max(100, Number(process.env.MAX_CACHE_ENTRIES) || 1000);

app.set('trust proxy', 1);

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

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// -------------------------------------------------------------
// RATE LIMITER LEGGERO IN MEMORIA PER IP
// -------------------------------------------------------------

const ipRateBuckets = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function apiRateLimiter(req, res, next) {
  if (req.path === '/health') {
    return next();
  }

  const now = Date.now();
  const ip = getClientIp(req);
  let bucket = ipRateBuckets.get(ip);

  if (!bucket || now - bucket.windowStart >= API_RATE_LIMIT_WINDOW_MS) {
    bucket = { count: 1, windowStart: now };
    ipRateBuckets.set(ip, bucket);
    return next();
  }

  bucket.count += 1;
  if (bucket.count > API_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.windowStart + API_RATE_LIMIT_WINDOW_MS - now) / 1000));
    res.set('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      error: 'Troppe richieste in poco tempo. Riprova tra qualche secondo.'
    });
  }

  return next();
}

app.use('/api', apiRateLimiter);

// -------------------------------------------------------------
// CACHE TTL + IN-FLIGHT DEDUPLICATION + SEMAFORO CONCORRENZA
// -------------------------------------------------------------

class MemoryCache {
  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Aggiorna ordine LRU
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs) {
    if (ttlMs <= 0) return;
    if (this.store.has(key)) {
      this.store.delete(key);
    }
    while (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) break;
      this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  deleteByPrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  prune() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

class AsyncSemaphore {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.active = 0;
    this.queue = [];
  }

  async run(fn) {
    if (this.active >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    this.active += 1;
    try {
      return await fn();
    } finally {
      this.active -= 1;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

const responseCache = new MemoryCache(MAX_CACHE_ENTRIES);
const inFlightRequests = new Map();
const sorareSemaphore = new AsyncSemaphore(SORARE_MAX_CONCURRENCY);

function dedupeInFlight(key, factoryFn) {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }
  const promise = Promise.resolve()
    .then(factoryFn)
    .finally(() => {
      if (inFlightRequests.get(key) === promise) {
        inFlightRequests.delete(key);
      }
    });
  inFlightRequests.set(key, promise);
  return promise;
}

// -------------------------------------------------------------
// SERIALIZZAZIONE ACCESSO AL TRACKER VENDITE SU DISCO
// -------------------------------------------------------------

let trackerMutex = Promise.resolve();
let cachedTrackerData = null;

function withTrackerLock(fn) {
  const next = trackerMutex.then(fn, fn);
  trackerMutex = next.catch(() => {});
  return next;
}

// -------------------------------------------------------------
// FUNZIONI COMUNI
// -------------------------------------------------------------

function sorareHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'SorarePilot/1.0'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = SORARE_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sorareGraphQL(query, variables = {}, token = null, options = {}) {
  const { cacheTtlMs = 0, cacheKey = null, retries = 1 } = options;

  if (cacheKey && cacheTtlMs > 0) {
    const cached = responseCache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }

  const execute = async () => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const data = await sorareSemaphore.run(async () => {
          const response = await fetchWithTimeout(SORARE_API, {
            method: 'POST',
            headers: sorareHeaders(token),
            body: JSON.stringify({ query, variables })
          });

          if (response.status === 429) {
            const retryAfterHeader = Number(response.headers.get('retry-after'));
            const waitMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
              ? Math.min(retryAfterHeader * 1000, 5000)
              : 600 * (attempt + 1);
            const err = new Error('Sorare rate limit (429)');
            err.status = 429;
            err.retryAfterMs = waitMs;
            throw err;
          }

          const result = await response.json();

          if (!response.ok) {
            const err = new Error(
              result.errors?.[0]?.message ||
              `Errore HTTP Sorare: ${response.status}`
            );
            err.status = response.status;
            throw err;
          }

          if (result.errors?.length) {
            const err = new Error(result.errors[0].message);
            err.graphQLErrors = result.errors;
            throw err;
          }

          return result.data;
        });

        if (cacheKey && cacheTtlMs > 0) {
          responseCache.set(cacheKey, data, cacheTtlMs);
        }
        return data;
      } catch (err) {
        lastError = err;
        const canRetry = attempt < retries && (err.status === 429 || err.status >= 500 || err.name === 'AbortError');
        if (!canRetry) {
          throw err;
        }
        await sleep(err.retryAfterMs || 400 * (attempt + 1));
      }
    }
    throw lastError;
  };

  if (cacheKey) {
    return dedupeInFlight(`gql:${cacheKey}`, execute);
  }
  return execute();
}

function getUserScope(token) {
  // Identificatore corto e non reversibile per segmentare cache e tracker per token/utente
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

async function getCurrentUserCached(token, queryText, queryName = 'user') {
  const scope = getUserScope(token);
  const cacheKey = `me:${scope}:${queryName}`;
  return sorareGraphQL(queryText, {}, token, {
    cacheKey,
    cacheTtlMs: USER_PROFILE_CACHE_TTL_MS,
    retries: 1
  });
}

function getNextGameWeekWindow(now = new Date()) {
  const current = new Date(now.getTime());
  const day = current.getUTCDay();
  const hourUtc = current.getUTCHours();

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
  const currentCycleDays = currentStartDay === 2 ? 3 : 4;

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

  const leagueObj = activeClub?.domesticLeague || null;
  const fallbackCompetition =
    leagueObj?.displayName ||
    leagueObj?.name ||
    leagueObj?.slug ||
    activeClub?.country?.name ||
    '';
  const fallbackLeagueSlug = leagueObj?.slug || '';

  const activeCompetitions = Array.isArray(activeClub?.activeCompetitions)
    ? activeClub.activeCompetitions
        .map(comp => ({
          slug: comp?.slug || '',
          name: comp?.name || '',
          displayName: comp?.displayName || ''
        }))
        .filter(c => c.slug || c.name || c.displayName)
    : [];

  for (const game of games) {
    if (!game || !game.date) continue;
    const gameMs = Date.parse(game.date);
    if (!Number.isFinite(gameMs)) continue;

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

    const competitionSlug = game.competition?.slug || fallbackLeagueSlug;

    return {
      hasUpcomingGame: true,
      opponent,
      isHome,
      nextGameDate: game.date,
      competition,
      competitionSlug,
      leagueSlug: fallbackLeagueSlug,
      activeCompetitions,
      gameWeekWindow: `Next GW (${nextGwWindow.startIso.slice(0, 10)}..${nextGwWindow.endIso.slice(0, 10)})`
    };
  }

  return {
    hasUpcomingGame: false,
    opponent: null,
    isHome: false,
    nextGameDate: null,
    competition: fallbackCompetition,
    competitionSlug: fallbackLeagueSlug,
    leagueSlug: fallbackLeagueSlug,
    activeCompetitions,
    gameWeekWindow: `Next GW (${nextGwWindow.startIso.slice(0, 10)}..${nextGwWindow.endIso.slice(0, 10)})`
  };
}

async function loadSalesTrackerAsync() {
  if (cachedTrackerData) {
    return cachedTrackerData;
  }
  try {
    await fsp.access(SALES_TRACKER_FILE);
    const raw = await fsp.readFile(SALES_TRACKER_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    cachedTrackerData = parsed && typeof parsed === 'object' && parsed.users
      ? parsed
      : { users: {} };
    return cachedTrackerData;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Errore lettura sales-tracker.json:', error);
    }
    cachedTrackerData = { users: {} };
    return cachedTrackerData;
  }
}

async function saveSalesTrackerAsync(trackerData) {
  cachedTrackerData = trackerData;
  const tmpFile = `${SALES_TRACKER_FILE}.${process.pid}.tmp`;
  try {
    await fsp.writeFile(tmpFile, JSON.stringify(trackerData, null, 2), 'utf8');
    await fsp.rename(tmpFile, SALES_TRACKER_FILE);
  } catch (error) {
    console.error('Errore salvataggio sales-tracker.json:', error);
    try {
      await fsp.unlink(tmpFile);
    } catch {
      // ignora eventuale file temporaneo residuo
    }
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

    const tokenResponse = await sorareSemaphore.run(() =>
      fetchWithTimeout(SORARE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'SorarePilot/1.0'
        },
        body: params.toString()
      })
    );

    const rawText = await tokenResponse.text();
    let tokenData = null;

    try {
      tokenData = JSON.parse(rawText);
      console.log('OAuth fields:', Object.keys(tokenData || {}), 'hasRefresh:', Boolean(tokenData?.refresh_token), 'expiresIn:', tokenData?.expires_in ?? null);
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

    const oauthRefreshSessions = new Map();
function storeOAuthSession(t,d){
 if(!t||!d||!d.refresh_token)return;
 oauthRefreshSessions.set(t,{refreshToken:String(d.refresh_token),expiresAt:Date.now()+(Number(d.expires_in)||86400)*1000});
}
async function refreshSorareAccessToken(t){
 const e=oauthRefreshSessions.get(t);
 if(!e||!e.refreshToken||!SORARE_TOKEN_URL||!SORARE_CLIENT_ID||!SORARE_CLIENT_SECRET)return null;
 const p=new URLSearchParams({client_id:SORARE_CLIENT_ID,client_secret:SORARE_CLIENT_SECRET,refresh_token:e.refreshToken,grant_type:'refresh_token'});
 const r=await sorareSemaphore.run(()=>fetchWithTimeout(SORARE_TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json','User-Agent':'SorarePilot/1.0'},body:p.toString()}));
 const d=await r.json().catch(()=>null);
 if(!r.ok||!d||!d.access_token)return null;
 oauthRefreshSessions.delete(t);
 oauthRefreshSessions.set(d.access_token,{refreshToken:d.refresh_token?String(d.refresh_token):e.refreshToken,expiresAt:Date.now()+(Number(d.expires_in)||86400)*1000});
 console.log('Token Sorare rinnovato automaticamente tramite refresh_token.');
 return d.access_token;
}
    const accessToken = tokenData.access_token;
    storeOAuthSession(accessToken, tokenData);

    const avatarQueries = ['query GetOAuthUser { currentUser { id nickname slug avatarUrl } }', 'query GetOAuthUser { currentUser { id nickname slug pictureUrl } }', 'query GetOAuthUser { currentUser { id nickname slug activeClub { pictureUrl } } }', 'query GetOAuthUser { currentUser { id nickname slug } }']; let userData = null; for (const q of avatarQueries) { try { const d = await sorareGraphQL(q, {}, accessToken, { cacheKey: `me:${getUserScope(accessToken)}:oauth`, cacheTtlMs: USER_PROFILE_CACHE_TTL_MS }); if (d && d.currentUser) { userData = d; break; } } catch (err) {} } const cu = (userData && userData.currentUser) ? userData.currentUser : {}; const nickname = cu.nickname || 'SorareUser'; const avatarUrl = cu.avatarUrl || cu.pictureUrl || (cu.activeClub && cu.activeClub.pictureUrl) || ''; return res.json({ success: true, token: accessToken, access_token: accessToken, nickname, avatarUrl, pictureUrl: avatarUrl });
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

    const saltResponse = await sorareSemaphore.run(() =>
      fetchWithTimeout(
        `https://api.sorare.com/api/v1/users/${encodeURIComponent(cleanUsername)}`,
        {
          headers: {
            'User-Agent': 'SorarePilot/1.0',
            'Accept': 'application/json'
          }
        }
      )
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
// LETTURA DELLE MISSIONI GIORNALIERE DAL JSON (CON CACHE)
// -------------------------------------------------------------

async function loadFormattedMissionsCached() {
  const cacheKey = 'missions:daily';
  const cached = responseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  return dedupeInFlight(cacheKey, async () => {
    const again = responseCache.get(cacheKey);
    if (again) return again;

    const fileData = await fsp.readFile(MISSIONS_FILE, 'utf8');
    const parsedData = JSON.parse(fileData);

    if (!Array.isArray(parsedData.missioni)) {
      const err = new Error('Formato missioni-oggi.json non valido.');
      err.statusCode = 400;
      throw err;
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

    const payload = {
      success: true,
      missions: dynamicMissions,
      total: dynamicMissions.length,
      date: parsedData.data || null
    };

    responseCache.set(cacheKey, payload, MISSIONS_CACHE_TTL_MS);
    return payload;
  });
}

app.post('/api/fetch-missions', async (req, res) => {
  try {
    try {
      await fsp.access(MISSIONS_FILE);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'File missioni-oggi.json non trovato.'
      });
    }

    const payload = await loadFormattedMissionsCached();
    return res.json(payload);
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    console.error('❌ Errore recupero missioni:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore durante il recupero delle missioni: ' + error.message
    });
  }
});

// -------------------------------------------------------------
// SINCRONIZZAZIONE CARTE UTENTE (CACHE + DEDUPLICA + TRACKER)
// -------------------------------------------------------------

const CARDS_QUERY_FULL = `
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
              u23Eligible
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
                activeCompetitions {
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
              l5: averageScore(type: LAST_FIVE_PLAYED)
              l10: averageScore(type: LAST_TEN_PLAYED)
              so5Scores(last: 20) {
                score
                status
                game {
                  date
                }
              }
            }
          }
        }
      }
    }
  }
`;

const CARDS_QUERY_WITH_GAMES = `
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
              age
              dateOfBirth
              u23Eligible
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
              so5Scores(last: 20) {
                score
              }
            }
          }
        }
      }
    }
  }
`;

const CARDS_QUERY_FALLBACK = `
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
              so5Scores(last: 20) {
                score
              }
            }
          }
        }
      }
    }
  }
`;

let preferredCardsQueryMode = 'full';

async function fetchUserCardsGraphQL(token, afterCursor) {
  const scope = getUserScope(token);
  const cursorKey = afterCursor || 'first';
  const cacheKey = `cards:${scope}:${cursorKey}`;

  const cached = responseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  return dedupeInFlight(cacheKey, async () => {
    const again = responseCache.get(cacheKey);
    if (again) return again;

    const runQuery = (queryStr) =>
      sorareGraphQL(queryStr, { after: afterCursor }, token, { retries: 1 });

    let data;
    if (preferredCardsQueryMode === 'full') {
      try {
        data = await runQuery(CARDS_QUERY_FULL);
      } catch (err) { console.error('[SorarePilot] CARDS_QUERY_FULL fallita:', err?.message || err);
        preferredCardsQueryMode = 'games';
        try {
          data = await runQuery(CARDS_QUERY_WITH_GAMES);
        } catch (err2) { console.error('[SorarePilot] CARDS_QUERY_WITH_GAMES fallita:', err2?.message || err2);
          preferredCardsQueryMode = 'fallback';
          data = await runQuery(CARDS_QUERY_FALLBACK);
        }
      }
    } else if (preferredCardsQueryMode === 'games') {
      try {
        data = await runQuery(CARDS_QUERY_WITH_GAMES);
      } catch (err2) { console.error('[SorarePilot] CARDS_QUERY_WITH_GAMES fallita:', err2?.message || err2);
        preferredCardsQueryMode = 'fallback';
        data = await runQuery(CARDS_QUERY_FALLBACK);
      }
    } else {
      data = await runQuery(CARDS_QUERY_FALLBACK);
    }

    responseCache.set(cacheKey, data, USER_CARDS_CACHE_TTL_MS);
    return data;
  });
}

function collectLineupCardRefs(node, cardIds, cardSlugs, insideCardsContainer = false) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) {
      collectLineupCardRefs(item, cardIds, cardSlugs, insideCardsContainer);
    }
    return;
  }
  const looksLikeCard =
    insideCardsContainer ||
    (typeof node.slug === 'string' && node.slug.includes('-')) ||
    (node.player && typeof node.player === 'object');
  if (looksLikeCard) {
    if (typeof node.id === 'string' && node.id.trim()) {
      cardIds.add(node.id.trim());
    }
    if (typeof node.slug === 'string' && node.slug.trim()) {
      cardSlugs.add(node.slug.trim());
    }
  }
  for (const [key, val] of Object.entries(node)) {
    const nextInsideCards = insideCardsContainer || /cards?|lineupCards?|slots?/i.test(key);
    collectLineupCardRefs(val, cardIds, cardSlugs, nextInsideCards);
  }
}

async function fetchActiveLineupCardSets(token, userKey = 'default') {
  const cardIds = new Set();
  const cardSlugs = new Set();
  if (!token) return { cardIds, cardSlugs };

  const candidateQueries = [
    {
      name: 'so5Lineups_cards',
      query: `query GetSo5LineupsCards { currentUser { id slug so5Lineups { id cards { id slug } } } }`
    },
    {
      name: 'so5Lineups_slots',
      query: `query GetSo5LineupsSlots { currentUser { id slug so5Lineups { id slots { card { id slug } } } } }`
    },
    {
      name: 'so5Lineups_lineupCards',
      query: `query GetSo5LineupsLineupCards { currentUser { id slug so5Lineups { id lineupCards { card { id slug } } } } }`
    },
    {
      name: 'activeSo5Lineups_cards',
      query: `query GetActiveSo5LineupsCards { currentUser { id slug activeSo5Lineups { id cards { id slug } } } }`
    },
    {
      name: 'upcomingSo5Lineups_cards',
      query: `query GetUpcomingSo5LineupsCards { currentUser { id slug upcomingSo5Lineups { id cards { id slug } } } }`
    },
    {
      name: 'lineups_cards',
      query: `query GetLineupsCards { currentUser { id slug lineups { id cards { id slug } } } }`
    },
    {
      name: 'so5Lineups_nodes',
      query: `query GetSo5LineupsNodes { currentUser { id slug so5Lineups { id cards { nodes { id slug } } } } }`
    }
  ];

  for (let i = 0; i < candidateQueries.length; i++) {
    const item = candidateQueries[i];
    const cacheKey = `active-lineups:${userKey}:${i}:${item.name}`;
    try {
      const data = await sorareGraphQL(item.query, {}, token, { retries: 0, cacheTtlMs: 30000, cacheKey });
      if (data?.currentUser) {
        collectLineupCardRefs(data.currentUser, cardIds, cardSlugs, false);
        if (cardIds.size > 0 || cardSlugs.size > 0) {
          console.log(`[LINEUPS] Query "${item.name}" ha trovato ${cardIds.size} ID e ${cardSlugs.size} slug in formazione.`);
          break;
        }
      }
    } catch (err) {
      console.warn(`[LINEUPS] Query "${item.name}" fallita:`, err?.message || err);
    }
  }

  return { cardIds, cardSlugs };
}

app.post('/api/user-cards', async (req, res) => {
  const { token, after = null } = req.body || {};

  if (!token) {
    return res.status(400).json({
      error: 'Token di autenticazione mancante.'
    });
  }

  try {
    let data = null;
    try { data = await fetchUserCardsGraphQL(token, after); } catch (err) { const m = String((err && err.message) || '').toLowerCase(); if (m.includes('invalid token') || m.includes('unauthorized') || m.includes('expired')) { const nt = await refreshSorareAccessToken(token); if (!nt) throw err; data = await fetchUserCardsGraphQL(nt, after); } else { throw err; } }
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
    const { cardIds: activeLineupCardIds, cardSlugs: activeLineupCardSlugs } = await fetchActiveLineupCardSets(token, userKey);

    const formattedCards = await withTrackerLock(async () => {
      const trackerData = await loadSalesTrackerAsync();
      const userTracker = getUserTracker(trackerData, userKey);
      const isInitialBaseline = !userTracker.initialized;
      let trackerChanged = false;

      const mapped = cardNodes.map(card => {
        let position = 'Forward';
        const rawPosition = (card.player?.position || '').toLowerCase();

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
        const isInActiveLineupSet = Boolean(
          (card.id && activeLineupCardIds.has(card.id)) ||
          (card.slug && activeLineupCardSlugs.has(card.slug))
        );
        const isInOtherLineup = Boolean(
          isInActiveLineupSet ||
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

        const nextRecord = {
          activeOfferId: currentOfferId,
          returnedFromSale,
          returnedAt,
          autoRelisted,
          lastPriceEur,
          lastDurationDays
        };

        if (
          prevRecord.activeOfferId !== nextRecord.activeOfferId ||
          prevRecord.returnedFromSale !== nextRecord.returnedFromSale ||
          prevRecord.returnedAt !== nextRecord.returnedAt ||
          prevRecord.autoRelisted !== nextRecord.autoRelisted ||
          prevRecord.lastPriceEur !== nextRecord.lastPriceEur ||
          prevRecord.lastDurationDays !== nextRecord.lastDurationDays
        ) {
          trackerChanged = true;
        }

        userTracker.cards[cardKey] = nextRecord;

        let listingStatus = 'NONE';
        if (isListed) {
          listingStatus = 'ACTIVE';
        } else if (returnedFromSale) {
          listingStatus = 'RETURNED';
        }

        const rawScores = Array.isArray(card.player?.so5Scores) ? [...card.player.so5Scores] : [];
        if (rawScores.some(s => s && typeof s === 'object' && s.game?.date)) {
          rawScores.sort((x, y) => Date.parse(y?.game?.date || 0) - Date.parse(x?.game?.date || 0));
        }
        const playedScores = rawScores.filter(s => {
          if (s === null || s === undefined) return false;
          if (typeof s === 'object') {
            if (s.status && String(s.status).toUpperCase().includes('DID_NOT_PLAY')) return false;
            return typeof s.score === 'number' && !isNaN(s.score) && (s.status ? true : s.score > 0);
          }
          return typeof s === 'number' && !isNaN(s) && s > 0;
        }).map(s => (typeof s === 'object' ? s.score : s));
        const last5 = playedScores.slice(0, 5);
        const fallbackL5 = last5.length > 0 ? Math.round(last5.reduce((x, y) => x + y, 0) / last5.length) : 0;
        const last10 = playedScores.slice(0, 10);
        const fallbackL10 = last10.length > 0 ? Math.round(last10.reduce((x, y) => x + y, 0) / last10.length) : 0;
        const l5Average = typeof card.player?.l5 === 'number' && !isNaN(card.player.l5) ? Math.round(card.player.l5) : fallbackL5;
        const l10Average = typeof card.player?.l10 === 'number' && !isNaN(card.player.l10) ? Math.round(card.player.l10) : fallbackL10;

        const gameInfo = extractNextGameWeekInfo(card.player?.activeClub, nextGwWindow);
        const officialU23 =
          typeof card.player?.u23Eligible === 'boolean' ? card.player.u23Eligible : undefined;

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
          inSeason: typeof card.inSeason === 'boolean' ? card.inSeason : Boolean(card.inSeasonEligible || (card.season && /2025|2026|2027|current|in_season/i.test(String(card.season.name || card.season.slug || card.season))) || new RegExp('2025|2026|2027').test(String(card.slug || '') + ' ' + String(card.name || ''))),
          isInLineup: Boolean(isInActiveLineupSet || card.isInLineup || isInOtherLineup),
          isInOtherLineup,
          hasUpcomingGame: gameInfo.hasUpcomingGame,
          gameWeek: gameInfo.gameWeekWindow,
          nextGameDate: gameInfo.nextGameDate,
          competition: gameInfo.competition,
          competitionSlug: gameInfo.competitionSlug,
          leagueSlug: gameInfo.leagueSlug,
          activeCompetitions: gameInfo.activeCompetitions,
          u23Eligible: officialU23,
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
          sealed: isSealed,
          isInVault,
          lastDurationDays,
          askingPrice: lastPriceEur,
          player: card.player ? {
            id: card.player.id,
            slug: card.player.slug,
            displayName: card.player.displayName,
            position: card.player.position,
            age: card.player.age,
            birthDate: card.player.dateOfBirth,
            u23Eligible: officialU23,
            activeClub: card.player.activeClub ? {
              slug: card.player.activeClub.slug,
              name: card.player.activeClub.name,
              pictureUrl: card.player.activeClub.pictureUrl,
              country: card.player.activeClub.country?.name,
              league:
                card.player.activeClub.domesticLeague?.displayName ||
                card.player.activeClub.domesticLeague?.name,
              competition: gameInfo.competition,
              activeCompetitions: gameInfo.activeCompetitions
            } : undefined
          } : undefined
        };
      });

      if (isInitialBaseline) {
        userTracker.initialized = true;
        trackerChanged = true;
      }

      if (trackerChanged) {
        await saveSalesTrackerAsync(trackerData);
      }

      return mapped;
    });

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
    const userData = await getCurrentUserCached(
      token,
      `
        query GetCurrentUserForRelist {
          currentUser {
            id
            slug
            nickname
          }
        }
      `,
      'relist'
    );

    const currentUser = userData?.currentUser;
    if (!currentUser) {
      return res.status(404).json({
        error: 'Profilo Sorare non trovato.'
      });
    }

    const userKey = currentUser.slug || currentUser.id || currentUser.nickname || 'default';

    const processedIds = await withTrackerLock(async () => {
      const trackerData = await loadSalesTrackerAsync();
      const userTracker = getUserTracker(trackerData, userKey);
      const ids = [];

      for (const item of relists) {
        const cardId = String(item.cardId || '');
        if (!cardId) continue;

        const tracked = userTracker.cards[cardId] || {};
        const priceEur = Number(item.priceEur ?? tracked.lastPriceEur ?? 0) || 0;
        const durationDays = Number(item.durationDays ?? tracked.lastDurationDays ?? 7) || 7;

        if (userTracker.cards[cardId]) {
          userTracker.cards[cardId].autoRelisted = true;
          userTracker.cards[cardId].returnedFromSale = false;
          userTracker.cards[cardId].lastPriceEur = priceEur;
          userTracker.cards[cardId].lastDurationDays = durationDays;
        }

        ids.push(cardId);
      }

      if (ids.length > 0) {
        await saveSalesTrackerAsync(trackerData);
      }
      return ids;
    });

    responseCache.deleteByPrefix(`cards:${getUserScope(token)}:`);

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
    const userData = await getCurrentUserCached(
      token,
      `
        query GetCurrentUserSlug {
          currentUser {
            id
            slug
            nickname
          }
        }
      `,
      'slug'
    );

    const currentUser = userData?.currentUser;
    if (!currentUser) {
      return res.status(404).json({
        error: 'Profilo Sorare non trovato.'
      });
    }

    const userKey = currentUser.slug || currentUser.id || currentUser.nickname || 'default';

    await withTrackerLock(async () => {
      const trackerData = await loadSalesTrackerAsync();
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

      await saveSalesTrackerAsync(trackerData);
    });

    responseCache.deleteByPrefix(`cards:${getUserScope(token)}:`);

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

    // Esecuzione limitata in parallelo tramite il semaforo condiviso verso Sorare
    const results = await Promise.all(
      submissions.map(async sub => {
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
            token,
            { retries: 0 }
          );

          const result = data?.createLineUp;

          if (result?.errors?.length) {
            return {
              missionId,
              status: 'ERROR',
              message: result.errors[0].message
            };
          }
          if (result?.lineUp?.id) {
            return {
              missionId,
              status: 'SUCCESS',
              message: 'Formazione inviata.'
            };
          }
          return {
            missionId,
            status: 'ERROR',
            message: 'Risposta Sorare non valida.'
          };
        } catch (error) {
          return {
            missionId,
            status: 'ERROR',
            message: error.message
          };
        }
      })
    );

    responseCache.deleteByPrefix(`cards:${getUserScope(token)}:`);

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
// SERVIZIO FRONTEND STATICO (BUILD VITE / DIST)
// -------------------------------------------------------------

if (fs.existsSync(DIST_DIR)) {
  app.use(
    express.static(DIST_DIR, {
      etag: true,
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(`${path.sep}index.html`) || filePath.endsWith('/index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    })
  );

  app.get(/^(?!\/api).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Pulizia periodica cache e rate bucket
const maintenanceTimer = setInterval(() => {
  responseCache.prune();
  const now = Date.now();
  for (const [ip, bucket] of ipRateBuckets.entries()) {
    if (now - bucket.windowStart >= API_RATE_LIMIT_WINDOW_MS) {
      ipRateBuckets.delete(ip);
    }
  }
}, 60000);
maintenanceTimer.unref();

// -------------------------------------------------------------
// AVVIO SERVER E SHUTDOWN PULITO
// -------------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log('======================================');
  console.log('🚀 SERVER SORAREPILOT ATTIVO');
  console.log(`🌐 Porta: ${PORT}`);
  console.log(`📁 Missioni: ${MISSIONS_FILE}`);
  console.log(`📁 Tracker vendite: ${SALES_TRACKER_FILE}`);
  console.log(`📦 Frontend dist: ${DIST_DIR}`);
  console.log(`⚡ Max concorrenza Sorare: ${SORARE_MAX_CONCURRENCY}`);
  console.log('======================================');
});

function gracefulShutdown(signal) {
  console.log(`Ricevuto ${signal}, chiusura ordinata del server...`);
  clearInterval(maintenanceTimer);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
