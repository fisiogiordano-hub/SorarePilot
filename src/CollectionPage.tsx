import React, { useState, useMemo } from 'react';

interface Card {
  id: string;
  name: string;
  slug: string;
  position: string[];
  rarity: string;
  seasonYear?: number;
  estimatedValue?: number;
  l5Score?: number;
  xpPercentage?: number;
  serialNumber?: number;
  maxSerial?: number;
}

interface CollectionPageProps {
  cards?: Card[];
  nickname?: string;
  onSyncClick?: () => void;
}

export const CollectionPage: React.FC<CollectionPageProps> = ({
  cards = [],
  nickname = 'ACCOUNT',
  onSyncClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedRarity, setSelectedRarity] = useState('all');

  // Normalizzazione rarità per filtri e confronti
  const formatRarity = (rarity: string) => {
    if (!rarity) return 'custom';
    const r = rarity.toLowerCase();
    if (r.includes('custom') || r.includes('set') || r.includes('common')) return 'custom';
    return r;
  };

  // Filtraggio dinamico della collezione
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // Filtro ricerca testo (nome giocatore o club)
      const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro ruolo
      const cardPositions = (card.position || []).map(p => p.toLowerCase());
      const matchesRole =
        selectedRole === 'all' ||
        cardPositions.some(p => p.includes(selectedRole.toLowerCase()));

      // Filtro rarità
      const cardRarity = formatRarity(card.rarity);
      const matchesRarity =
        selectedRarity === 'all' ||
        cardRarity === selectedRarity.toLowerCase();

      return matchesSearch && matchesRole && matchesRarity;
    });
  }, [cards, searchTerm, selectedRole, selectedRarity]);

  // Calcolo corretto del Valore Stimato Totale (escludendo carte SET / Custom)
  const totalEstimatedValue = useMemo(() => {
    return cards.reduce((acc, card) => {
      const rarity = formatRarity(card.rarity);
      // Le carte SET non hanno valore economico sul mercato
      if (rarity === 'custom') return acc;

      // Valore reale della carta se presente, altrimenti stima predefinita per la rarità
      const cardValue = card.estimatedValue ?? (
        rarity === 'unique' ? 1500 :
        rarity === 'super_rare' ? 300 :
        rarity === 'rare' ? 50 :
        rarity === 'limited' ? 15 : 0
      );
      return acc + cardValue;
    }, 0);
  }, [cards]);

  // Calcolo Media L5
  const averageL5 = useMemo(() => {
    const cardsWithL5 = cards.filter(c => c.l5Score !== undefined && c.l5Score > 0);
    if (cardsWithL5.length === 0) return 50;
    const totalL5 = cardsWithL5.reduce((acc, c) => acc + (c.l5Score || 0), 0);
    return Math.round(totalL5 / cardsWithL5.length);
  }, [cards]);

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-6">
      {/* Header Gestione Collezione */}
      <div className="bg-[#131822] border border-[#1e2638] rounded-xl p-6 mb-6 flex justify-between items-center">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#34d399] font-bold">Sorare Pilot</span>
          <h1 className="text-3xl font-extrabold mt-1">Gestione Collezione</h1>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
            Account collegato:
            <span className="bg-[#10b981]/20 text-[#34d399] px-2 py-0.5 rounded font-mono text-xs">
              {nickname}
            </span>
          </p>
        </div>
        <button
          onClick={onSyncClick}
          className="bg-[#10b981] hover:bg-[#059669] text-black font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sincronizza Account Reale
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-[#131822] border border-[#1e2638] rounded-xl p-5">
          <span className="text-gray-400 text-sm">Totale Carte</span>
          <div className="text-3xl font-bold mt-2">{cards.length}</div>
        </div>
        <div className="bg-[#131822] border border-[#1e2638] rounded-xl p-5">
          <span className="text-gray-400 text-sm">Valore Stimato</span>
          <div className="text-3xl font-bold text-[#34d399] mt-2">€{totalEstimatedValue.toLocaleString()}</div>
        </div>
        <div className="bg-[#131822] border border-[#1e2638] rounded-xl p-5">
          <span className="text-gray-400 text-sm">Media L5 Galleria</span>
          <div className="text-3xl font-bold text-[#60a5fa] mt-2">{averageL5}</div>
        </div>
      </div>

      {/* Barra di Ricerca e Filtri */}
      <div className="bg-[#131822] border border-[#1e2638] rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cerca giocatore o club..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0b0e14] border border-[#1e2638] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#10b981]"
          />
        </div>

        <div className="flex gap-3">
          {/* Selettore Ruoli */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-[#0b0e14] border border-[#1e2638] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#10b981]"
          >
            <option value="all">Tutti i Ruoli</option>
            <option value="keeper">Goalkeeper</option>
            <option value="defender">Defender</option>
            <option value="midfielder">Midfielder</option>
            <option value="forward">Forward</option>
          </select>

          {/* Selettore Rarità con opzione SET */}
          <select
            value={selectedRarity}
            onChange={(e) => setSelectedRarity(e.target.value)}
            className="bg-[#0b0e14] border border-[#1e2638] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#10b981]"
          >
            <option value="all">Tutte le Rarità</option>
            <option value="custom">SET</option>
            <option value="limited">Limited</option>
            <option value="rare">Rare</option>
            <option value="super_rare">Super Rare</option>
            <option value="unique">Unique</option>
          </select>
        </div>
      </div>

      {/* Griglia Carte */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredCards.map((card) => {
          const rarityFormatted = formatRarity(card.rarity);
          return (
            <div key={card.id} className="bg-[#131822] border border-[#1e2638] rounded-xl p-4 flex flex-col justify-between hover:border-[#10b981] transition">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#1e2638] text-[#34d399]">
                    {rarityFormatted === 'custom' ? 'SET' : rarityFormatted.replace('_', ' ')}
                  </span>
                  {card.serialNumber && (
                    <span className="text-xs text-gray-400 font-mono">
                      #{card.serialNumber}{card.maxSerial ? `/${card.maxSerial}` : ''}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-white truncate">{card.name}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {(card.position || []).join(', ') || 'N/D'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#1e2638] flex justify-between items-center text-xs">
                <span className="text-gray-400">L5: <strong className="text-white">{card.l5Score ?? '—'}</strong></span>
                <span className="text-[#34d399] font-semibold">
                  {rarityFormatted === 'custom' ? 'SET' : `€${(card.estimatedValue ?? 0).toLocaleString()}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};