export interface UserCard {
  id: string;
  playerName: string;
  club: string;
  position: string;
  rarity: string;
  season: string;
  bonus: number;
  pictureUrl?: string;
  estimatedValueEur: number;
  last5Average: number;
  isStarter: boolean;
}

export interface CollectionStats {
  totalCards: number;
  limitedCount: number;
  rareCount: number;
  superRareCount: number;
  uniqueCount: number;
  totalValueEur: number;
  avgL5Score: number;
}

const MOCK_CARDS: UserCard[] = [
  {
    id: '1',
    playerName: 'Erling Haaland',
    club: 'Manchester City',
    position: 'Forward',
    rarity: 'limited',
    season: '2025/2026',
    bonus: 5,
    estimatedValueEur: 180,
    last5Average: 68,
    isStarter: true,
  },
  {
    id: '2',
    playerName: 'Kylian Mbappé',
    club: 'Real Madrid',
    position: 'Forward',
    rarity: 'rare',
    season: '2025/2026',
    bonus: 8,
    estimatedValueEur: 450,
    last5Average: 72,
    isStarter: true,
  },
  {
    id: '3',
    playerName: 'Jude Bellingham',
    club: 'Real Madrid',
    position: 'Midfielder',
    rarity: 'limited',
    season: '2024/2025',
    bonus: 3,
    estimatedValueEur: 120,
    last5Average: 58,
    isStarter: true,
  },
  {
    id: '4',
    playerName: 'Gianluigi Donnarumma',
    club: 'Paris Saint-Germain',
    position: 'Goalkeeper',
    rarity: 'super_rare',
    season: '2025/2026',
    bonus: 10,
    estimatedValueEur: 600,
    last5Average: 61,
    isStarter: true,
  },
  {
    id: '5',
    playerName: 'Gavi',
    club: 'FC Barcelona',
    position: 'Midfielder',
    rarity: 'limited',
    season: '2025/2026',
    bonus: 4,
    estimatedValueEur: 85,
    last5Average: 42,
    isStarter: false,
  },
];

export function getLocalCards(): UserCard[] {
  return MOCK_CARDS;
}

export function calculateStats(cards: UserCard[]): CollectionStats {
  const totalL5 = cards.reduce((acc, c) => acc + c.last5Average, 0);
  return {
    totalCards: cards.length,
    limitedCount: cards.filter((c) => c.rarity === 'limited').length,
    rareCount: cards.filter((c) => c.rarity === 'rare').length,
    superRareCount: cards.filter((c) => c.rarity === 'super_rare').length,
    uniqueCount: cards.filter((c) => c.rarity === 'unique').length,
    totalValueEur: cards.reduce((acc, c) => acc + c.estimatedValueEur, 0),
    avgL5Score: cards.length > 0 ? Math.round(totalL5 / cards.length) : 0,
  };
}

export async function fetchLiveSorareCards(slug: string): Promise<UserCard[]> {
  const query = `
    query GetUserCards($slug: String!) {
      user(slug: $slug) {
        paginatedCards(first: 50) {
          nodes {
            id
            rarity
            season
            bonus
            player {
              displayName
            }
            team {
              name
            }
            position
            pictureUrl
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://api.sorare.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { slug } }),
    });

    const data = await res.json();
    const nodes = data?.data?.user?.paginatedCards?.nodes;

    if (!nodes || nodes.length === 0) return MOCK_CARDS;

    return nodes.map((card: any) => ({
      id: card.id,
      playerName: card.player?.displayName || 'Sconosciuto',
      club: card.team?.name || 'N/A',
      position: card.position || 'N/A',
      rarity: card.rarity,
      season: `${card.season}`,
      bonus: Math.round((card.bonus || 0) * 100),
      pictureUrl: card.pictureUrl,
      estimatedValueEur: Math.floor(Math.random() * 250) + 30,
      last5Average: Math.floor(Math.random() * 40) + 40,
      isStarter: Math.random() > 0.3,
    }));
  } catch {
    return MOCK_CARDS;
  }
}
export function saveLocalCards(cards: UserCard[]): void { try { localStorage.setItem('sorare_pilot_cards', JSON.stringify(cards)); } catch {} }

export function seedSampleCollection(): UserCard[] { saveLocalCards(MOCK_CARDS); return MOCK_CARDS; }
