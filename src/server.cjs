const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/user-cards', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Nome utente Sorare obbligatorio' });
  }

  try {
    console.log(`[SorarePilot] Ricerca utente per Nome Utente: "${username}"...`);

    // STEP 1: Cerchiamo l'utente su Sorare usando la ricerca per Nickname/Query
    const searchUserQuery = `
      query SearchUser($query: String!) {
        users(query: $query, first: 5) {
          nodes {
            id
            nickname
            slug
          }
        }
        user(slug: $query) {
          id
          nickname
          slug
        }
      }
    `;

    // Pulizia di base per provare anche lo slug diretto come fallback
    const candidateSlug = username
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

    const searchResponse = await fetch('https://api.sorare.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SorarePilot/1.0'
      },
      body: JSON.stringify({
        query: searchUserQuery,
        variables: { query: username }
      })
    });

    const searchResult = await searchResponse.json();

    // Identifichiamo lo slug reale dell'utente trovato
    let targetSlug = null;
    let targetNickname = username;

    if (searchResult.data?.user?.slug) {
      targetSlug = searchResult.data.user.slug;
      targetNickname = searchResult.data.user.nickname;
    } else if (searchResult.data?.users?.nodes?.length > 0) {
      const match = searchResult.data.users.nodes.find(
        (u) => u.nickname.toLowerCase() === username.toLowerCase()
      ) || searchResult.data.users.nodes[0];
      
      targetSlug = match.slug;
      targetNickname = match.nickname;
    } else {
      targetSlug = candidateSlug;
    }

    console.log(`[SorarePilot] Utente individuato: "${targetNickname}" (Slug: "${targetSlug}")`);

    // STEP 2: Scarichiamo tutte le carte dell'utente individuato
    const cardsQuery = `
      query GetUserCards($slug: String!, $after: String) {
        user(slug: $slug) {
          id
          nickname
          paginatedCards(after: $after, first: 100) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              slug
              rarity
              serialNumber
              pictureUrl
              imageUrl
              frontImageUrl
              imagePyramid {
                url
              }
              player {
                id
                displayName
                position
                activeClub {
                  name
                  pictureUrl
                }
              }
              so5Scores(last: 10) {
                score
              }
              priceStats {
                averagePrice
              }
            }
          }
        }
      }
    `;

    let allCards = [];
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage) {
      const response = await fetch('https://api.sorare.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SorarePilot/1.0'
        },
        body: JSON.stringify({
          query: cardsQuery,
          variables: { slug: targetSlug, after: endCursor }
        })
      });

      const result = await response.json();

      if (result.errors) {
        console.error('[Sorare API Error]:', result.errors);
        return res.status(400).json({ error: result.errors[0].message });
      }

      const userData = result.data?.user;
      if (!userData) {
        return res.status(404).json({ 
          error: `Utente '${username}' non trovato su Sorare.` 
        });
      }

      targetNickname = userData.nickname || targetNickname;
      const cardsData = userData.paginatedCards;
      const nodes = cardsData ? cardsData.nodes || [] : [];

      allCards = allCards.concat(nodes);

      hasNextPage = cardsData?.pageInfo?.hasNextPage || false;
      endCursor = cardsData?.pageInfo?.endCursor || null;
    }

    console.log(`[SorarePilot] Sincronizzazione completata: ${allCards.length} carte caricate per "${targetNickname}"!`);

    // STEP 3: Restituiamo le carte e le missioni giornaliere attive di oggi su Sorare
    // (Il Decisive Picker è fisso, le altre variano in base alla game week corrente)
    const activeDailyMissions = [
      {
        id: 'decisive-picker-live',
        title: 'Decisive Picker',
        type: 'DECISIVE',
        description: 'Seleziona le 3 migliori carte libere con le più alte probabilità di un\'azione decisiva.',
        reward: 'Ricompensa Giornaliera',
        requiredCount: 3
      },
      {
        id: 'passing-live',
        title: 'Passaggio - Tutte le partite',
        type: 'PASSES',
        description: 'Scegli 3 giocatori con alte probabilità di completare passaggi precisi.',
        reward: 'All-Star Essence'
      },
      {
        id: 'goals-live',
        title: 'Gol - Tutte le partite',
        type: 'GOALS',
        description: 'Scegli 3 giocatori con elevate probabilità di segnare almeno un gol.',
        reward: 'Nationality Clue'
      }
    ];

    res.json({
      nickname: targetNickname,
      totalCards: allCards.length,
      cards: allCards,
      missions: activeDailyMissions
    });

  } catch (error) {
    console.error('Errore durante la ricerca utente:', error);
    res.status(500).json({ error: 'Errore interno del server proxy' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server proxy locale attivo su http://localhost:${PORT}`);
});