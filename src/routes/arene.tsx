import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface Arena {
  id: string;
  name: string;
  category: 'In-Season' | 'Classic' | 'Cap';
  description: string;
  maxCap?: number;
  entryCount: number;
}

const MOCK_ARENAS: Arena[] = [
  {
    id: '1',
    name: 'All Star - In Season',
    category: 'In-Season',
    description: 'Schiera le tue carte della stagione corrente senza restrizioni di campionato.',
    entryCount: 1240,
  },
  {
    id: '2',
    name: 'Cap 240 Limited',
    category: 'Cap',
    maxCap: 240,
    description: 'Il totale della media L5 dei tuoi 5 giocatori non deve superare 240 punti.',
    entryCount: 3890,
  },
  {
    id: '3',
    name: 'Champion Europe',
    category: 'Classic',
    description: 'Aperta solo ai giocatori dei primi 5 campionati europei.',
    entryCount: 850,
  },
];

function ArenePage() {
  const [selectedArena, setSelectedArena] = useState<Arena | null>(MOCK_ARENAS[0]);

  return (
    <div className="space-y-6">
      <div>
        <div className="label-mono">COMPETIZIONI & REGOLE</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Arene Sorare</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esplora le divisioni disponibili e controlla i requisiti di accesso prima di schierare la tua formazione.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {MOCK_ARENAS.map((arena) => (
          <div
            key={arena.id}
            onClick={() => setSelectedArena(arena)}
            className={`cursor-pointer rounded-xl border p-5 transition-all flex flex-col justify-between ${
              selectedArena?.id === arena.id
                ? 'border-primary bg-primary/10 ring-1 ring-primary/25'
                : 'border-border bg-card hover:bg-accent'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase text-foreground">
                  {arena.category}
                </span>
                {arena.maxCap && (
                  <span className="font-mono text-xs font-bold text-primary">
                    CAP {arena.maxCap}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-foreground text-base mt-2">{arena.name}</h3>
              <p className="text-xs text-muted-foreground">{arena.description}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-xs font-mono text-muted-foreground">
              <span>Iscritti: {arena.entryCount}</span>
              <ShieldCheck className="size-4 text-primary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/arene')({
  component: ArenePage,
});