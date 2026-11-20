import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { getLocalCards, UserCard } from '../lib/collection-service';
import {
  optimizeLineup,
  calculateCardExpectedScore,
} from '../lib/lineup-service';
import { Sparkles, Users, X, Trophy } from 'lucide-react';

function LineupsPage() {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, UserCard | null>>({
    GK: null,
    DEF: null,
    MID: null,
    FWD: null,
    EXTRA: null,
  });

  useEffect(() => {
    const localCards = getLocalCards();
    setCards(localCards);
  }, []);

  const handleAutoOptimize = () => {
    const result = optimizeLineup(cards);
    setSelectedSlots(result.slots);
  };

  const handleRemoveCard = (slotKey: string) => {
    setSelectedSlots((prev) => ({ ...prev, [slotKey]: null }));
  };

  const handleSelectCard = (slotKey: string, cardId: string) => {
    const card = cards.find((c) => c.id === cardId) || null;
    setSelectedSlots((prev) => ({ ...prev, [slotKey]: card }));
  };

  const totalScore = Object.values(selectedSlots)
    .filter((c): c is UserCard => c !== null)
    .reduce((acc, card) => acc + calculateCardExpectedScore(card), 0);

  const renderSlot = (
    slotKey: string,
    label: string,
    requiredPos?: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'
  ) => {
    const currentCard = selectedSlots[slotKey];
    const usedIds = Object.values(selectedSlots)
      .filter((c): c is UserCard => c !== null)
      .map((c) => c.id);

    const availableForSlot = cards.filter((c) => {
      if (usedIds.includes(c.id) && c.id !== currentCard?.id) return false;
      if (requiredPos && c.position !== requiredPos) return false;
      return true;
    });

    return (
      <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-xs font-mono font-bold text-primary uppercase">
            {label}
          </span>
          {currentCard && (
            <button
              onClick={() => handleRemoveCard(slotKey)}
              className="text-muted-foreground hover:text-destructive p-1 transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {currentCard ? (
          <div className="mt-3 space-y-2">
            <div>
              <h4 className="font-semibold text-foreground text-sm">
                {currentCard.playerName}
              </h4>
              <p className="text-xs text-muted-foreground">{currentCard.club}</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border text-xs font-mono">
              <span className="text-muted-foreground">{currentCard.position}</span>
              <span className="font-bold text-success">
                Score: {calculateCardExpectedScore(currentCard)}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <select
              onChange={(e) => handleSelectCard(slotKey, e.target.value)}
              defaultValue=""
              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="" disabled>
                + Schiera {label}
              </option>
              {availableForSlot.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.playerName} ({c.club}) - {calculateCardExpectedScore(c)} pts
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="label-mono">OTTIMIZZATORE FORMAZIONE</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Lineup Builder
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Componi la tua formazione ideale o usa l'algoritmo per massimizzare il punteggio atteso.
          </p>
        </div>

        <button
          onClick={handleAutoOptimize}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90 cursor-pointer"
        >
          <Sparkles className="size-4" />
          Ottimizza Automaticamente
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-6 backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Punteggio Totale Atteso
            </span>
          </div>
          <span className="text-2xl font-bold font-mono text-success">
            {Math.round(totalScore * 10) / 10} pts
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {renderSlot('GK', 'Portiere (GK)', 'Goalkeeper')}
          {renderSlot('DEF', 'Difensore (DEF)', 'Defender')}
          {renderSlot('MID', 'Centrocampista (MID)', 'Midfielder')}
          {renderSlot('FWD', 'Attaccante (FWD)', 'Forward')}
          {renderSlot('EXTRA', 'Extra')}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/lineups')({
  component: LineupsPage,
});