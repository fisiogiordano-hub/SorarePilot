import { useState, useEffect } from 'react';
import { getLocalCards, type UserCard } from './lib/collection-service';
import { Shield, Sparkles, UserPlus, X } from 'lucide-react';

interface LineupSlots {
  GK: UserCard | null;
  DEF: UserCard | null;
  MID: UserCard | null;
  FWD: UserCard | null;
  EXTRA: UserCard | null;
}

export default function LineupBuilder() {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [lineup, setLineup] = useState<LineupSlots>({
    GK: null,
    DEF: null,
    MID: null,
    FWD: null,
    EXTRA: null,
  });

  useEffect(() => {
    setCards(getLocalCards());
  }, []);

  const selectCardForSlot = (slotKey: keyof LineupSlots, card: UserCard) => {
    setLineup((prev) => ({ ...prev, [slotKey]: card }));
  };

  const removeCardFromSlot = (slotKey: keyof LineupSlots) => {
    setLineup((prev) => ({ ...prev, [slotKey]: null }));
  };

  const calculateLineupL5 = () => {
    const selected = Object.values(lineup).filter(Boolean) as UserCard[];
    return selected.reduce((acc, c) => acc + c.last5Average, 0);
  };

  const autoOptimizeLineup = () => {
    const sortedGK = cards.filter((c) => c.position === 'Goalkeeper').sort((a, b) => b.last5Average - a.last5Average);
    const sortedDEF = cards.filter((c) => c.position === 'Defender').sort((a, b) => b.last5Average - a.last5Average);
    const sortedMID = cards.filter((c) => c.position === 'Midfielder').sort((a, b) => b.last5Average - a.last5Average);
    const sortedFWD = cards.filter((c) => c.position === 'Forward').sort((a, b) => b.last5Average - a.last5Average);

    const gk = sortedGK[0] || null;
    const def = sortedDEF[0] || null;
    const mid = sortedMID[0] || null;
    const fwd = sortedFWD[0] || null;

    const usedIds = [gk?.id, def?.id, mid?.id, fwd?.id].filter(Boolean);
    const extra = cards
      .filter((c) => !usedIds.includes(c.id))
      .sort((a, b) => b.last5Average - a.last5Average)[0] || null;

    setLineup({ GK: gk, DEF: def, MID: mid, FWD: fwd, EXTRA: extra });
  };

  const renderSlot = (slotKey: keyof LineupSlots, label: string, requiredPos?: string) => {
    const card = lineup[slotKey];
    const availableCards = cards.filter((c) => {
      const isAlreadyUsed = Object.values(lineup).some((selected) => selected?.id === c.id);
      if (isAlreadyUsed) return false;
      if (!requiredPos) return true;
      return c.position === requiredPos;
    });

    return (
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col justify-between min-h-36">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
            {label}
          </span>
          {card && (
            <button
              onClick={() => removeCardFromSlot(slotKey)}
              className="text-zinc-500 hover:text-rose-400 text-xs p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {card ? (
          <div>
            <p className="text-white font-bold text-sm">{card.playerName}</p>
            <p className="text-xs text-zinc-400">{card.club}</p>
            <div className="mt-3 flex justify-between items-center text-xs font-mono">
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase text-[10px]">
                {card.rarity}
              </span>
              <span className="text-blue-400 font-bold">L5: {card.last5Average}</span>
            </div>
          </div>
        ) : (
          <div className="relative">
            <select
              onChange={(e) => {
                const found = cards.find((c) => c.id === e.target.value);
                if (found) selectCardForSlot(slotKey, found);
              }}
              defaultValue=""
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-400 text-xs py-2 px-2 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="" disabled>
                + Seleziona {label}
              </option>
              {availableCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.playerName} ({c.club}) - L5: {c.last5Average}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-emerald-400 font-mono font-semibold">
            LINEUP BUILDER
          </p>
          <h1 className="text-3xl font-bold tracking-tight mt-1 text-white">Schiera Formazione</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Ottimizza i punteggi L5 stimati per la prossima Gameweek.
          </p>
        </div>

        <button
          onClick={autoOptimizeLineup}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Autocompila Miglior Lineup
        </button>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl space-y-6">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <span className="text-sm text-zinc-400 font-mono">Punteggio L5 Totale Stimato:</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {calculateLineupL5()} pts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {renderSlot('GK', 'Portiere (GK)', 'Goalkeeper')}
          {renderSlot('DEF', 'Difensore (DEF)', 'Defender')}
          {renderSlot('MID', 'Centrocampista (MID)', 'Midfielder')}
          {renderSlot('FWD', 'Attaccante (FWD)', 'Forward')}
          {renderSlot('EXTRA', 'Extra (Qualsiasi)')}
        </div>
      </div>
    </div>
  );
}