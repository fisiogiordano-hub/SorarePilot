import type { UserCard } from './collection-service';
import { saveLocalCards } from './collection-service';

const SORARE_GRAPHQL_ENDPOINT = 'https://api.sorare.com/graphql';

const GET_USER_CARDS_QUERY = `
  query GetUserCards($slug: String!) {
    user(slug: $slug) {
      id
      nickname
      cards {
        nodes {
          id
          assetId
          name
          position
          rarity
          serialNumber
          season {
            startYear
          }
          team {
            name
          }
        }
      }
    }
  }
`;

export interface SorareSyncResult {
  success: boolean;
  cardsCount: number;
  error?: string;
}

export const fetchAndSyncSorareUserCards = async (
  sorareNickname: string,
  apiKey?: string
): Promise<SorareSyncResult> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Se fornisci l'API key, la aggiungiamo all'header
    if (apiKey && apiKey.trim() !== '') {
      headers['API-KEY'] = apiKey.trim();
    }

    const response = await fetch(SORARE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: GET_USER_CARDS_QUERY,
        variables: { slug: sorareNickname.toLowerCase() },
      }),
    });

    const json = await response.json();

    if (json.errors && json.errors.length > 0) {
      return { success: false, cardsCount: 0, error: json.errors[0].message };
    }

    const rawCards = json?.data?.user?.cards?.nodes;

    if (!rawCards) {
      return { success: false, cardsCount: 0, error: 'Utente non trovato o galleria vuota.' };
    }

    const mappedCards: UserCard[] = rawCards.map((card: any, index: number) => {
      let mappedPosition: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward' = 'Midfielder';
      const pos = (card.position || '').toLowerCase();
      if (pos.includes('goalkeeper') || pos.includes('gk')) mappedPosition = 'Goalkeeper';
      else if (pos.includes('defender') || pos.includes('def')) mappedPosition = 'Defender';
      else if (pos.includes('forward') || pos.includes('fwd') || pos.includes('striker')) mappedPosition = 'Forward';

      return {
        id: card.id || `sorare-${index}`,
        sorareCardId: card.assetId || card.id,
        playerId: card.id,
        playerName: card.name || 'Sconosciuto',
        position: mappedPosition,
        rarity: (card.rarity || 'limited').toLowerCase(),
        serialNumber: card.serialNumber || 1,
        season: card.season?.startYear || 2024,
        bonus: 5.0,
        club: card.team?.name || 'Free Agent',
        updatedAt: new Date().toISOString(),
      };
    });

    saveLocalCards(mappedCards);

    return {
      success: true,
      cardsCount: mappedCards.length,
    };
  } catch (err: any) {
    return {
      success: false,
      cardsCount: 0,
      error: err?.message || 'Errore di connessione con le API di Sorare.',
    };
  }
};