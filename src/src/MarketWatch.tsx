import { useState } from 'react';
import { TrendingUp, ShoppingBag, Plus, Trash2 } from 'lucide-react';

interface TargetCard {
  id: string;
  playerName: string;
  club: string;
  rarity: string;
  targetPriceEur: number;
  currentMarketPriceEur: number;
}

export default function MarketWatch() {
  const [watchlist, setWatchlist] = useState<TargetCard[]>([
    {
      id: '101',
      playerName: 'Lautaro Martínez',
      club: 'Inter',
      rarity: 'rare',
      targetPriceEur: 300,
      currentMarketPriceEur: 320,
    },
    {
      id: '102',
      playerName: 'Pedri',
      club: 'FC Barcelona',
      rarity: 'limited',
      targetPriceEur: 90,
      currentMarketPriceEur: 85,
    },
  ]);

  const [name, setName] = useState('');
  const [club, setClub] = useState('');
  const [targetPrice, setTargetPrice] = useState('');

  const addTarget = () => {
    if (!name || !targetPrice) return;
    const newTarget: TargetCard = {
      id: Date.now().toString(),
      playerName: name,
      club: club || 'N/A',
      rarity: 'limited',
      targetPriceEur: parseFloat(targetPrice),
      currentMarketPriceEur: Math.floor(parseFloat(targetPrice) * (0.9 + Math.random() * 0.2)),
    };
    setWatchlist([...watchlist, newTarget]);
    setName('');
    setClub('');
    setTargetPrice('');
  };

  const removeTarget = (id: string) => {
    setWatchlist(watchlist.filter((item) => item.id !== id));
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-emerald-400 font-mono font-semibold">
            MARKET WATCHLIST
          </p>
          <h1 className="text-3xl font-bold tracking-tight mt-1 text-white">Target di Mercato</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Monitora i prezzi obiettivo delle carte che desideri acquistare.
          </p>
        </div>
      </div>

      {/* Form Aggiunta Target */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" /> Aggiungi Giocatore alla Watchlist
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Nome Giocatore..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="Club..."
            value={club}
            onChange={(e) => setClub(e.target.value)}
            className="px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          />
          <input
            type="number"
            placeholder="Prezzo Target (€)..."
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={addTarget}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold rounded-lg text-xs transition-all cursor-pointer"
          >
            Aggiungi Target
          </button>
        </div>
      </div>

      {/* Lista Carte in Target */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {watchlist.map((item) => {
          const isGoodDeal = item.currentMarketPriceEur <= item.targetPriceEur;
          return (
            <div
              key={item.id}
              className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
                    {item.rarity}
                  </span>
                  {isGoodDeal && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                      BUY ALERT!
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-white text-base">{item.playerName}</h4>
                <p className="text-xs text-zinc-400">{item.club}</p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right font-mono">
                  <p className="text-xs text-zinc-500">Target: €{item.targetPriceEur}</p>
                  <p
                    className={`text-lg font-bold ${
                      isGoodDeal ? 'text-emerald-400' : 'text-zinc-300'
                    }`}
                  >
                    Attuale: €{item.currentMarketPriceEur}
                  </p>
                </div>
                <button
                  onClick={() => removeTarget(item.id)}
                  className="text-zinc-500 hover:text-rose-400 p-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}