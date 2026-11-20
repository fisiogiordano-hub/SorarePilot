import type { UserCard } from './collection-service';

export interface LineupSlot {
  positionLabel: 'GK' | 'DEF' | 'MID' | 'FWD' | 'EXTRA';
  requiredPosition?: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';
  card: UserCard | null;
}

export interface ProposedLineup {
  slots: Record<string, UserCard | null>;
  totalExpectedScore: number;
}

/**
  Calcola il punteggio stimato di una carta considerando una media L5 base e il bonus XP %
 */
export const calculateCardExpectedScore = (card: UserCard): number => {
  // Simulazione base score L5 per carte mock (es. 50 se non definito)
  const baseL5 = 50 + (card.last5Average || 50);
  const bonusMultiplier = 1 + card.bonus / 100;
  return Math.round(baseL5 * bonusMultiplier * 10) / 10;
};

/**
  Algoritmo di ottimizzazione automatica: seleziona le migliori carte disponibili per ogni ruolo
 */
export const optimizeLineup = (availableCards: UserCard[]): ProposedLineup => {
  const cardsWithScores = availableCards.map((c) => ({
    card: c,
    score: calculateCardExpectedScore(c),
  }));

  const getBestForPosition = (
    pos: string,
    usedIds: Set<string>
  ): UserCard | null => {
    const candidates = cardsWithScores
      .filter((item) => item.card.position === pos && !usedIds.has(item.card.id))
      .sort((a, b) => b.score - a.score);
    return candidates[0] ? candidates[0].card : null;
  };

  const usedCardIds = new Set<string>();

  const gk = getBestForPosition('Goalkeeper', usedCardIds);
  if (gk) usedCardIds.add(gk.id);

  const def = getBestForPosition('Defender', usedCardIds);
  if (def) usedCardIds.add(def.id);

  const mid = getBestForPosition('Midfielder', usedCardIds);
  if (mid) usedCardIds.add(mid.id);

  const fwd = getBestForPosition('Forward', usedCardIds);
  if (fwd) usedCardIds.add(fwd.id);

  // Per lo slot EXTRA prende la carta rimasta col punteggio più alto in qualsiasi ruolo
  const remainingCandidates = cardsWithScores
    .filter((item) => !usedCardIds.has(item.card.id))
    .sort((a, b) => b.score - a.score);

  const extra = remainingCandidates[0] ? remainingCandidates[0].card : null;

  const slots = {
    GK: gk,
    DEF: def,
    MID: mid,
    FWD: fwd,
    EXTRA: extra,
  };

  const totalExpectedScore = Object.values(slots)
    .filter((c): c is UserCard => c !== null)
    .reduce((sum, card) => sum + calculateCardExpectedScore(card), 0);

  return {
    slots,
    totalExpectedScore: Math.round(totalExpectedScore * 10) / 10,
  };
};