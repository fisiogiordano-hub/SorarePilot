import { playInsertCoinReady, formatInsertCoinReady } from './retroCue';
import { useState, useMemo, useEffect } from 'react';
import { translations } from './translations';
import type { Lang } from './translations';

export interface CardCompetitionRef {
  slug?: string;
  name?: string;
  displayName?: string;
}

export interface OfficialGameWeekInfo {
  gameWeek: number | null;
  slug?: string | null;
  startDate: string;
  endDate: string;
  cutOffDate?: string;
  state?: string;
}

export interface Card {
  id: string;
  slug?: string;
  rarity: string;
  serialNumber?: number;
  pictureUrl?: string;
  name?: string;
  position?: string;
  team?: string;
  competition?: string;
  competitionSlug?: string;
  leagueSlug?: string;
  activeCompetitions?: CardCompetitionRef[];
  u23Eligible?: boolean;
  league?: string;
  age?: number;
  birthDate?: string;
  dateOfBirth?: string;
  l10Average?: number;
  starterChance?: number;
  priceEur?: number;
  isAvailable?: boolean;
  canPlayLineup?: boolean;
  isInVault?: boolean;
  isOnSale?: boolean;
  isInOtherLineup?: boolean;
  sealed?: boolean;
  locked?: boolean;
  inVault?: boolean;
  onSale?: boolean;
  inLineup?: boolean;
  isInLineup?: boolean;
  usedInLineup?: boolean;
  lineups?: unknown[];
  listingStatus?: string;
  liveSingleSaleOffer?: { id?: string } | null;
  status?: string;
  hasUpcomingGame?: boolean;
  gameWeek?: string;
  nextGameDate?: string | null;
  opponent?: string | null;
  isHome?: boolean;
  player?: {
    id: string;
    slug?: string;
    displayName: string;
    position: string;
    age?: number;
    birthDate?: string;
    dateOfBirth?: string;
    u23Eligible?: boolean;
    activeClub?: {
      slug?: string;
      name: string;
      pictureUrl: string;
      league?: string;
      competition?: string;
      country?: string;
      activeCompetitions?: CardCompetitionRef[];
    };
  };
  so5Scores?: { score: number }[];
}

interface LineupBuilderProps {
  cards: Card[];
  currentLang?: Lang;
  liveGameWeek?: OfficialGameWeekInfo | null;
  upcomingGameWeek?: OfficialGameWeekInfo | null;
}

interface ArenaRoom {
  id: string;
  name: string;
  cap: number;
  rarity: string;
  entryFee?: number;
  competitionSlugs?: string[];
  leagueAliases?: string[];
  u23Only?: boolean;
}

const ARENA_ROOMS: ArenaRoom[] = [
  // --- ORDERED FIRST ---
  { id: 'all-star-beginner', name: 'All Star - Beginner', cap: 260, rarity: 'LIMITED', entryFee: 100 },
  { id: 'all-star-cap-220', name: 'All Star - Cap 220', cap: 220, rarity: 'LIMITED', entryFee: 200 },

  // --- REST OF ALL STAR ROOMS ---
  { id: 'all-star-cap-260', name: 'All Star - Cap 260', cap: 260, rarity: 'LIMITED', entryFee: 300 },
  { id: 'all-star-bonus-260', name: 'All Star - Bonus 260', cap: 260, rarity: 'LIMITED', entryFee: 300 },
  { id: 'all-star-uncapped', name: 'All Star - Uncapped', cap: 0, rarity: 'LIMITED', entryFee: 300 },
  { id: 'all-star-elite', name: 'All Star - Elite', cap: 0, rarity: 'LIMITED', entryFee: 800 },

  // --- LEAGUE ARENAS & SPECIALS (Cap 260 / 300 Essence) ---
  {
    id: 'premier-league-arena',
    name: 'Premier League Arena',
    cap: 260,
    rarity: 'LIMITED',
    entryFee: 300,
    competitionSlugs: ['premier-league'],
    leagueAliases: ['premier league', 'epl', 'english premier league']
  },
  {
    id: 'laliga-arena',
    name: 'LALIGA EA SPORTS Arena',
    cap: 260,
    rarity: 'LIMITED',
    entryFee: 300,
    competitionSlugs: ['laliga-ea-sports', 'la-liga', 'primera-division'],
    leagueAliases: ['laliga', 'la liga', 'primera division']
  },
  {
    id: 'bundesliga-arena',
    name: 'Bundesliga Arena',
    cap: 260,
    rarity: 'LIMITED',
    entryFee: 300,
    competitionSlugs: ['bundesliga'],
    leagueAliases: ['bundesliga', '1. bundesliga']
  },
  {
    id: 'serie-a-arena',
    name: 'Serie A Arena',
    cap: 260,
    rarity: 'LIMITED',
    entryFee: 300,
    competitionSlugs: ['serie-a'],
    leagueAliases: ['serie a', 'lega serie a']
  },
  {
    id: 'ligue-1-arena',
    name: 'Ligue 1 McDonald\'s Arena',
    cap: 260,
    rarity: 'LIMITED',
    entryFee: 300,
    competitionSlugs: ['ligue-1-mcdonalds', 'ligue-1'],
    leagueAliases: ['ligue 1', 'ligue 1 mcdonald']
  },
  {
    id: 'mls-arena',
    name: 'MLS Arena',
    cap: 260,
    rarity: 'LIMITED',
    entryFee: 300,
    competitionSlugs: ['major-league-soccer', 'mls'],
    leagueAliases: ['mls', 'major league soccer']
  },
  {
    id: 'eredivisie-arena',
    name: 'Eredivisie Arena',
    cap: 260,
    rarity: 'LIMITED',
    entryFee: 300,
    competitionSlugs: ['eredivisie'],
    leagueAliases: ['eredivisie']
  },
  {
    id: 'jupiler-pro-league-arena',
    name: 'Jupiler Pro League Arena',
    cap: 260,
    rarity: 'LIMITED',
    entryFee: 300,
    competitionSlugs: ['jupiler-pro-league'],
    leagueAliases: ['jupiler pro league', 'belgian pro league']
  },
  {
    id: 'j-league-arena',
    name: 'J. League Arena',
    cap: 260,
    rarity: 'LIMITED',
    entryFee: 300,
    competitionSlugs: ['j1-league', 'j-league'],
    leagueAliases: ['j. league', 'j league', 'j1 league']
  },
  {
    id: 'k-league-arena',
    name: 'K League Arena',
    cap: 260,
    rarity: 'LIMITED',
    entryFee: 300,
    competitionSlugs: ['k-league-1', 'k-league'],
    leagueAliases: ['k league', 'k league 1']
  },
  {
    id: 'super-lig-arena',
    name: 'Süper Lig Arena',
    cap: 260,
    rarity: 'LIMITED',
    entryFee: 300,
    competitionSlugs: ['super-lig'],
    leagueAliases: ['super lig', 'süper lig']
  },
  {
    id: 'liga-portugal-arena',
    name: 'Liga Portugal Arena',
    cap: 260,
    rarity: 'LIMITED',
    entryFee: 300,
    competitionSlugs: ['liga-portugal', 'primeira-liga'],
    leagueAliases: ['liga portugal', 'primeira liga']
  },
  {
    id: 'u23-arena',
    name: 'Under 23 (U23) Arena',
    cap: 260,
    rarity: 'LIMITED',
    entryFee: 300,
    u23Only: true
  },
];

function normalizeText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCardBlockedForLineup(card: Card): boolean {
  if (card.canPlayLineup === false) return true;
  if (card.isAvailable === false) return true;

  const inVault = Boolean(card.isInVault || card.sealed || card.locked || card.inVault);
  const onSale = Boolean(
    card.isOnSale ||
    card.onSale ||
    card.liveSingleSaleOffer?.id ||
    card.listingStatus === 'ACTIVE' ||
    card.listingStatus === 'LISTED'
  );
  const inOtherLineup = Boolean(
    card.isInOtherLineup ||
    card.inLineup ||
    card.isInLineup ||
    card.usedInLineup ||
    (Array.isArray(card.lineups) && card.lineups.length > 0)
  );

  const normalizedStatus = String(card.status || '').toUpperCase();
  const statusBlocked = [
    'VAULT',
    'IN_VAULT',
    'SEALED',
    'LOCKED',
    'ON_SALE',
    'LISTED',
    'FOR_SALE',
    'IN_LINEUP',
    'LINEUP'
  ].includes(normalizedStatus);

  return inVault || onSale || inOtherLineup || statusBlocked;
}

function hasGameInNextGameWeek(card: Card): boolean {
  if (card.hasUpcomingGame === false) return false;

  if (card.nextGameDate) {
    const gameMs = Date.parse(card.nextGameDate);
    if (Number.isFinite(gameMs)) {
      return gameMs > Date.now();
    }
  }

  return Boolean(card.hasUpcomingGame === true || card.opponent || card.gameWeek);
}

function getPlayerAge(card: Card): number | null {
  const directAge = card.player?.age ?? card.age;
  if (typeof directAge === 'number' && Number.isFinite(directAge) && directAge > 0) {
    return directAge;
  }

  const dobRaw = card.player?.birthDate || card.player?.dateOfBirth || card.birthDate || card.dateOfBirth;
  if (!dobRaw) return null;

  const dobMs = Date.parse(dobRaw);
  if (!Number.isFinite(dobMs)) return null;

  const dob = new Date(dobMs);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  return age;
}

function matchesRoomCompetitionOrAge(card: Card, room: ArenaRoom): boolean {
  if (room.u23Only) {
    const officialU23 = card.player?.u23Eligible ?? card.u23Eligible;
    if (typeof officialU23 === 'boolean') {
      return officialU23;
    }
    const age = getPlayerAge(card);
    if (age === null || age > 23) return false;
    return true;
  }

  const hasSlugFilter = Array.isArray(room.competitionSlugs) && room.competitionSlugs.length > 0;
  const hasAliasFilter = Array.isArray(room.leagueAliases) && room.leagueAliases.length > 0;

  if (!hasSlugFilter && !hasAliasFilter) {
    return true;
  }

  const clubComps = [
    ...(Array.isArray(card.activeCompetitions) ? card.activeCompetitions : []),
    ...(Array.isArray(card.player?.activeClub?.activeCompetitions) ? card.player.activeClub.activeCompetitions : [])
  ];

  const cardSlugs = [
    card.competitionSlug,
    card.leagueSlug,
    ...clubComps.map(c => c?.slug)
  ]
    .map(normalizeText)
    .filter(Boolean);

  if (hasSlugFilter && cardSlugs.length > 0) {
    const normalizedSlugs = room.competitionSlugs!.map(normalizeText);
    if (cardSlugs.some(slug => normalizedSlugs.includes(slug))) {
      return true;
    }
  }

  const sources = [
    card.competition,
    card.league,
    card.player?.activeClub?.competition,
    card.player?.activeClub?.league,
    ...clubComps.flatMap(c => [c?.displayName, c?.name, c?.slug])
  ]
    .map(normalizeText)
    .filter(Boolean);

  if (sources.length === 0) return false;

  if (hasAliasFilter) {
    return sources.some(src =>
      room.leagueAliases!.some(alias => src.includes(normalizeText(alias)))
    );
  }

  return false;
}

function getPlayerKey(card: Card): string {
  if (card.player?.id) {
    return String(card.player.id).trim().toLowerCase();
  }
  if (card.player?.slug) {
    return String(card.player.slug).trim().toLowerCase();
  }
  const rawName = (card.player?.displayName || card.name || '').trim().toLowerCase();
  if (rawName) {
    return rawName.replace(/\s+/g, ' ');
  }
  return String(card.id).trim().toLowerCase();
}

export default function LineupBuilder({
  cards,
  currentLang = 'IT',
  liveGameWeek,
  upcomingGameWeek
}: LineupBuilderProps) {
  const t = (key: string) => translations[currentLang]?.[key] || translations['IT']?.[key] || key;

  const [selectedRoom, setSelectedRoom] = useState<ArenaRoom>(ARENA_ROOMS[0]);

  const [gwState, setGwState] = useState<{
    liveGameWeek: OfficialGameWeekInfo | null;
    upcomingGameWeek: OfficialGameWeekInfo | null;
  }>({
    liveGameWeek: liveGameWeek ?? null,
    upcomingGameWeek: upcomingGameWeek ?? null
  });

  useEffect(() => {
    if (liveGameWeek !== undefined || upcomingGameWeek !== undefined) {
      setGwState({
        liveGameWeek: liveGameWeek ?? null,
        upcomingGameWeek: upcomingGameWeek ?? null
      });
    }
  }, [liveGameWeek, upcomingGameWeek]);

  useEffect(() => {
    let active = true;

    const syncGameWeek = async () => {
      try {
        const res = await fetch('/api/gameweek');
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setGwState({
          liveGameWeek: data.liveGameWeek ?? null,
          upcomingGameWeek: data.upcomingGameWeek ?? null
        });
      } catch {
        // Mantiene l'ultimo valore noto in caso di errore temporaneo
      }
    };

    syncGameWeek();
    const intervalId = setInterval(syncGameWeek, 60000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  const [gk, setGk] = useState<Card | null>(null);
  const [def, setDef] = useState<Card | null>(null);
  const [mid, setMid] = useState<Card | null>(null);
  const [fwd, setFwd] = useState<Card | null>(null);
  const [extra, setExtra] = useState<Card | null>(null);

  const [manualCaptainId, setManualCaptainId] = useState<string | null>(null);
  const [suggestNotice, setSuggestNotice] = useState<string | null>(null);
  const [lineupReadyNotice, setLineupReadyNotice] = useState<string | null>(null);

  const getL10 = (card: Card): number => {
    if (typeof card.l10Average === 'number' && card.l10Average > 0) return card.l10Average;
    if (!card.so5Scores || card.so5Scores.length === 0) return 0;
    const last10 = card.so5Scores.slice(0, 10);
    const sum = last10.reduce((acc, s) => acc + (s.score || 0), 0);
    return Math.round(sum / last10.length);
  };

  const getStarterChance = (card: Card): number => {
    return card.starterChance ?? 85;
  };

  const getPosition = (card: Card): string => {
    const raw = (card.position || card.player?.position || 'Midfielder').toLowerCase();
    if (raw.includes('goal') || raw === 'gk') return 'Goalkeeper';
    if (raw.includes('def')) return 'Defender';
    if (raw.includes('mid')) return 'Midfielder';
    if (raw.includes('for') || raw.includes('att') || raw === 'fwd') return 'Forward';
    return 'Midfielder';
  };

  const captainId = useMemo(() => {
    const activeLineup = [gk, def, mid, fwd, extra].filter(Boolean) as Card[];
    if (activeLineup.length === 0) return null;

    if (manualCaptainId && activeLineup.some(c => c.id === manualCaptainId)) {
      return manualCaptainId;
    }

    let bestScore = -1;
    let selectedCaptain = activeLineup[0];

    for (const c of activeLineup) {
      const weightedScore = getL10(c) * (getStarterChance(c) / 100);
      if (weightedScore > bestScore) {
        bestScore = weightedScore;
        selectedCaptain = c;
      }
    }
    return selectedCaptain.id;
  }, [gk, def, mid, fwd, extra, manualCaptainId]);

  const availableCards = useMemo(() => {
    return cards.filter(c => {
      if (isCardBlockedForLineup(c)) return false;
      if (!hasGameInNextGameWeek(c)) return false;
      const isCorrectRarity = selectedRoom.rarity === 'ALL' || (c.rarity || '').toUpperCase() === selectedRoom.rarity;
      if (!isCorrectRarity) return false;
      if (!matchesRoomCompetitionOrAge(c, selectedRoom)) return false;
      return true;
    });
  }, [cards, selectedRoom]);

  const handleAutoSuggest = () => {
    setSuggestNotice(null);

    const getQuality = (c: Card) => getL10(c) * (getStarterChance(c) / 100);
    const sortByQualityDesc = (a: Card, b: Card) => getQuality(b) - getQuality(a);

    const gks = availableCards.filter(c => getPosition(c) === 'Goalkeeper').sort(sortByQualityDesc);
    const defs = availableCards.filter(c => getPosition(c) === 'Defender').sort(sortByQualityDesc);
    const mids = availableCards.filter(c => getPosition(c) === 'Midfielder').sort(sortByQualityDesc);
    const fwds = availableCards.filter(c => getPosition(c) === 'Forward').sort(sortByQualityDesc);

    const uniquePlayersCount = new Set(availableCards.map(getPlayerKey)).size;
    if (!gks.length || !defs.length || !mids.length || !fwds.length || uniquePlayersCount < 5) {
      console.log('DEBUG LINEUP:', {
        room: selectedRoom.id,
        totaleCarte: cards.length,
        limited: cards.filter(c => (c.rarity || '').toUpperCase() === 'LIMITED').length,
        nonBloccate: cards.filter(c => !isCardBlockedForLineup(c)).length,
        conPartita: cards.filter(c => hasGameInNextGameWeek(c)).length,
        availableCards: availableCards.length,
        ruoli: { gk: gks.length, def: defs.length, mid: mids.length, fwd: fwds.length },
        esempioCarta: cards[0]
      });

      setSuggestNotice(
        `Non hai abbastanza giocatori distinti ${selectedRoom.rarity} idonei per "${selectedRoom.name}" (con partita nella prossima GW, competizione/età valida e liberi) per comporre 5 giocatori diversi.`
      );
      return;
    }

    let bestValidLineup: { gk: Card; def: Card; mid: Card; fwd: Card; extra: Card } | null = null;
    let maxValidQuality = -1;

    let fallbackLowestLineup: { gk: Card; def: Card; mid: Card; fwd: Card; extra: Card } | null = null;
    let lowestSum = Infinity;
    let bestFallbackQuality = -1;

    const maxCap = selectedRoom.cap === 0 ? Infinity : selectedRoom.cap;
    const MAX_STEPS = 250000;
    let steps = 0;

    for (const currentGk of gks) {
      if (steps > MAX_STEPS) break;
      const gkL10 = getL10(currentGk);
      if (maxCap !== Infinity && gkL10 > maxCap) continue;

      const gkPlayer = getPlayerKey(currentGk);

      for (const currentDef of defs) {
        if (steps > MAX_STEPS) break;
        const defPlayer = getPlayerKey(currentDef);
        if (defPlayer === gkPlayer) continue;

        const defL10 = getL10(currentDef);
        const sum2 = gkL10 + defL10;
        if (maxCap !== Infinity && sum2 > maxCap) continue;

        for (const currentMid of mids) {
          if (steps > MAX_STEPS) break;
          const midPlayer = getPlayerKey(currentMid);
          if (midPlayer === gkPlayer || midPlayer === defPlayer) continue;

          const midL10 = getL10(currentMid);
          const sum3 = sum2 + midL10;
          if (maxCap !== Infinity && sum3 > maxCap) continue;

          for (const currentFwd of fwds) {
            if (steps > MAX_STEPS) break;
            const fwdPlayer = getPlayerKey(currentFwd);
            if (fwdPlayer === gkPlayer || fwdPlayer === defPlayer || fwdPlayer === midPlayer) continue;

            const fwdL10 = getL10(currentFwd);
            const sum4 = sum3 + fwdL10;
            if (maxCap !== Infinity && sum4 > maxCap) continue;

            const usedCardIds = new Set([currentGk.id, currentDef.id, currentMid.id, currentFwd.id]);
            const usedPlayers = new Set([gkPlayer, defPlayer, midPlayer, fwdPlayer]);

            const remainingOutfields = availableCards
              .filter(c => {
                if (getPosition(c) === 'Goalkeeper') return false;
                if (usedCardIds.has(c.id)) return false;
                if (usedPlayers.has(getPlayerKey(c))) return false;
                return true;
              })
              .sort(sortByQualityDesc);

            for (const currentExtra of remainingOutfields) {
              steps++;
              if (steps > MAX_STEPS) {
                break;
              }

              const extraL10 = getL10(currentExtra);
              const sumL10 = sum4 + extraL10;

              const totalQuality =
                getQuality(currentGk) +
                getQuality(currentDef) +
                getQuality(currentMid) +
                getQuality(currentFwd) +
                getQuality(currentExtra);

              if (sumL10 <= maxCap && totalQuality > maxValidQuality) {
                maxValidQuality = totalQuality;
                bestValidLineup = {
                  gk: currentGk,
                  def: currentDef,
                  mid: currentMid,
                  fwd: currentFwd,
                  extra: currentExtra
                };
              }

              if (sumL10 < lowestSum || (sumL10 === lowestSum && totalQuality > bestFallbackQuality)) {
                lowestSum = sumL10;
                bestFallbackQuality = totalQuality;
                fallbackLowestLineup = {
                  gk: currentGk,
                  def: currentDef,
                  mid: currentMid,
                  fwd: currentFwd,
                  extra: currentExtra
                };
              }
            }
          }
        }
      }
    }

    if (bestValidLineup) {
      setGk(bestValidLineup.gk);
      setDef(bestValidLineup.def);
      setMid(bestValidLineup.mid);
      setFwd(bestValidLineup.fwd);
      setExtra(bestValidLineup.extra);
      setManualCaptainId(null);
    } else if (fallbackLowestLineup) {
      setGk(fallbackLowestLineup.gk);
      setDef(fallbackLowestLineup.def);
      setMid(fallbackLowestLineup.mid);
      setFwd(fallbackLowestLineup.fwd);
      setExtra(fallbackLowestLineup.extra);
      setManualCaptainId(null);
      setSuggestNotice(
        `Nessuna combinazione idonea per "${selectedRoom.name}" nella prossima GW entra nel Cap ${selectedRoom.cap}: inserita la combinazione a somma L10 più bassa (${lowestSum}).`
      );
    } else {
      setSuggestNotice(
        `Impossibile trovare 5 giocatori distinti per la prossima GW entro il Cap L10 di ${selectedRoom.cap}.`
      );
    }
  };

  const handleSendLineupToApp = () => {
    const slots = [gk, def, mid, fwd, extra].filter(Boolean);
    if (slots.length === 0) { setLineupReadyNotice('Seleziona almeno una carta prima di inviare la formazione.'); return; }
    playInsertCoinReady(true);
    setLineupReadyNotice(formatInsertCoinReady('Formazione (' + slots.length + '/5 carte) inviata sull\x27app'));
  };
  const handleClearLineup = () => {
    setGk(null);
    setDef(null);
    setMid(null);
    setFwd(null);
    setExtra(null);
    setManualCaptainId(null);
    setSuggestNotice(null);
  };

  const captainTooltipText =
    t('captainTooltip') !== 'captainTooltip'
      ? t('captainTooltip')
      : 'Capitano calcolato su L10 x % Titolarità (modificabile con 1 click)';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gray-900 p-6 rounded-xl border border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-[#ffea00]">Suggeritore Arena Rooms</h1>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {gwState.liveGameWeek ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE: {gwState.liveGameWeek.gameWeek ? `GW #${gwState.liveGameWeek.gameWeek}` : 'Game Week in corso'}
                <span className="text-emerald-400/80 font-normal">
                  ({new Date(gwState.liveGameWeek.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} - {new Date(gwState.liveGameWeek.endDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })})
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs font-semibold px-3 py-1 rounded-full">
                Nessuna GW Live al momento
              </span>
            )}

            {gwState.upcomingGameWeek && (
              <span className="inline-flex items-center gap-1.5 bg-[#ffea00]/10 border border-[#ffea00]/30 text-[#ffea00] text-xs font-bold px-3 py-1 rounded-full">
                Schieramento: {gwState.upcomingGameWeek.gameWeek ? `GW #${gwState.upcomingGameWeek.gameWeek}` : 'Prossima GW'}
                <span className="text-[#ffea00]/80 font-normal">
                  (start {new Date(gwState.upcomingGameWeek.startDate).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })})
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-300 font-medium">{t('roomLabel') || 'Stanza:'}</label>
          <select
            value={selectedRoom.id}
            onChange={(e) => {
              const room = ARENA_ROOMS.find(r => r.id === e.target.value);
              if (room) {
                setSelectedRoom(room);
                handleClearLineup();
              }
            }}
            className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-[#ffea00] font-semibold focus:outline-none focus:border-[#ffea00]"
          >
            {ARENA_ROOMS.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} {r.cap > 0 ? `(Cap ${r.cap})` : '(No Cap)'} {r.entryFee ? `[${r.entryFee} Essence]` : ''}
              </option>
            ))}
          </select>

          <button
            onClick={handleAutoSuggest}
            className="bg-[#ffea00] hover:bg-[#e6d200] font-bold px-5 py-2.5 rounded-lg text-gray-950 transition-all shadow-lg cursor-pointer"
          >
            ⚡ {t('suggestLineup') || 'Suggerisci Formazione'}
          </button>
        </div>
      </div>

      {lineupReadyNotice && (<div className='bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-bold p-4 rounded-xl'>{lineupReadyNotice}</div>)}{lineupReadyNotice && (<div className='bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-bold p-4 rounded-xl'>{lineupReadyNotice}</div>)}{suggestNotice && (
        <div className="bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-bold p-4 rounded-xl">
          ⚠️ {suggestNotice}
        </div>
      )}

      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-200">{t('startingQuintet') || 'Quintetto Titolare'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{captainTooltipText}</p>
          </div>
          <div className='flex items-center gap-3'><button type='button' onClick={handleSendLineupToApp} className='bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-xs font-black px-3.5 py-2 rounded-lg transition-colors cursor-pointer'>Invia Formazione</button><button type='button' onClick={handleClearLineup} className="text-xs text-gray-400 hover:text-red-400 underline cursor-pointer">
            {t('clearAll') || 'Svuota Slot'}</button></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <SlotCard title="GK (Portiere)" card={gk} captainId={captainId} getL10={getL10} getStarterChance={getStarterChance} onSetCaptain={setManualCaptainId} t={t} />
          <SlotCard title="DEF (Difensore)" card={def} captainId={captainId} getL10={getL10} getStarterChance={getStarterChance} onSetCaptain={setManualCaptainId} t={t} />
          <SlotCard title="MID (Centrocampista)" card={mid} captainId={captainId} getL10={getL10} getStarterChance={getStarterChance} onSetCaptain={setManualCaptainId} t={t} />
          <SlotCard title="FWD (Attaccante)" card={fwd} captainId={captainId} getL10={getL10} getStarterChance={getStarterChance} onSetCaptain={setManualCaptainId} t={t} />
          <SlotCard title="EXTRA (Utility)" card={extra} captainId={captainId} getL10={getL10} getStarterChance={getStarterChance} onSetCaptain={setManualCaptainId} t={t} />
        </div>
      </div>
    </div>
  );
}

interface SlotCardProps {
  title: string;
  card: Card | null;
  captainId: string | null;
  getL10: (c: Card) => number;
  getStarterChance: (c: Card) => number;
  onSetCaptain: (id: string) => void;
  t: (key: string) => string;
}

function SlotCard({ title, card, captainId, getL10, onSetCaptain, t }: SlotCardProps) {
  if (!card) {
    return (
      <div className="border-2 border-dashed border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[220px] bg-gray-950 text-gray-500">
        <span className="text-xs font-bold mb-2">{title}</span>
        <span className="text-xs">{t('emptySlot') || 'Vuoto'}</span>
      </div>
    );
  }

  const isCaptain = captainId === card.id;
  const displayName = card.name || card.player?.displayName || 'Giocatore';
  const teamName = card.team || card.player?.activeClub?.name || 'Club';

  return (
    <div className={`relative bg-gray-950 border ${isCaptain ? 'border-amber-400 ring-1 ring-amber-400/20' : 'border-gray-800'} rounded-xl p-4 flex flex-col items-center text-center shadow-lg justify-between`}>
      <div>
        {isCaptain && (
          <span className="absolute top-2 right-2 bg-amber-400 text-gray-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow">
            C (+20%)
          </span>
        )}

        <span className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">{title}</span>

        {card.pictureUrl && (
          <img src={card.pictureUrl} alt={displayName} className="w-16 h-24 object-contain my-1 drop-shadow-md mx-auto" />
        )}

        <span className="text-xs font-bold text-gray-100 truncate max-w-full block mt-1">{displayName}</span>
        <span className="text-[10px] text-gray-400 block mb-1">{teamName}</span>
        {card.opponent && (
          <span className="text-[10px] text-emerald-400 font-semibold block mb-2">
            {card.isHome ? 'vs' : '@'} {card.opponent}
          </span>
        )}
      </div>

      <div className="w-full mt-3 pt-2 border-t border-gray-800 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Media L10:</span>
          <span className="font-bold text-[#ffea00]">{getL10(card)}</span>
        </div>

        {!isCaptain ? (
          <button
            onClick={() => onSetCaptain(card.id)}
            className="w-full bg-gray-800 hover:bg-[#ffea00] hover:text-gray-950 text-gray-300 text-[10px] font-bold py-1 transition-colors cursor-pointer"
          >
            ⭐ Assegna Fascia
          </button>
        ) : (
          <span className="text-[10px] text-amber-400 font-bold block">Capitano Attivo</span>
        )}
      </div>
    </div>
  );
}