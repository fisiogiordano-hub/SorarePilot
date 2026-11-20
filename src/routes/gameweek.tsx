import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import {
  getLocalGameWeeks,
  getCurrentGameWeek,
  GameWeek,
  Fixture,
} from '../lib/gameweek-service';
import { getLocalCards, UserCard } from '../lib/collection-service';
import { Calendar, ShieldAlert, Trophy, Clock, Users } from 'lucide-react';

function GameWeekPage() {
  const [gameWeeks, setGameWeeks] = useState<GameWeek[]>([]);
  const [selectedGw, setSelectedGw] = useState<GameWeek | null>(null);
  const [userCards, setUserCards] = useState<UserCard[]>([]);

  useEffect(() => {
    const gws = getLocalGameWeeks();
    setGameWeeks(gws);
    const active = getCurrentGameWeek();
    setSelectedGw(active);

    const cards = getLocalCards();
    setUserCards(cards);
  }, []);

  const getCardsForTeam = (teamName: string): UserCard[] => {
    return userCards.filter(
      (card) => card.club.toLowerCase() === teamName.toLowerCase()
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="label-mono">CALENDARIO & FIXTURES</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Game Week & Programmazione
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta le partite in arrivo e scopri quali tuoi giocatori scenderanno in campo.
          </p>
        </div>
      </div>

      {/* Selector GameWeek */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {gameWeeks.map((gw) => (
          <button
            key={gw.id}
            onClick={() => setSelectedGw(gw)}
            className={`flex flex-col rounded-xl border px-4 py-3 text-left transition-all ${
              selectedGw?.id === gw.id
                ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/25'
                : 'border-border bg-card/50 text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <span className="text-xs font-mono font-semibold uppercase">
              {gw.name}
            </span>
            <span className="mt-1 text-[11px] font-medium">
              {gw.status === 'OPEN'
                ? '🟢 IN CORSO'
                : gw.status === 'UPCOMING'
                ? '🟡 PROSSIMA'
                : '⚪ CONCLUSA'}
            </span>
          </button>
        ))}
      </div>

      {/* Main GW View */}
      {selectedGw && (
        <div className="space-y-6">
          {/* Status Box */}
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Trophy className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  {selectedGw.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedGw.startDate).toLocaleDateString('it-IT')} -{' '}
                  {new Date(selectedGw.endDate).toLocaleDateString('it-IT')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <Clock className="size-4" />
              <span>
                Fixtures in programma:{' '}
                <strong className="text-foreground">
                  {selectedGw.fixtures.length}
                </strong>
              </span>
            </div>
          </div>

          {/* Fixtures List */}
          <div className="space-y-4">
            <h3 className="text-sm font-mono uppercase text-muted-foreground">
              Partite della Game Week
            </h3>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {selectedGw.fixtures.map((fx: Fixture) => {
                const homeCards = getCardsForTeam(fx.homeTeam);
                const awayCards = getCardsForTeam(fx.awayTeam);
                const totalInvolved = homeCards.length + awayCards.length;

                return (
                  <div
                    key={fx.id}
                    className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 space-y-4"
                  >
                    {/* Competition Badge & Date */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-[10px] font-medium text-foreground">
                        {fx.competition}
                      </span>
                      <span>
                        {new Date(fx.date).toLocaleString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Teams Matchup */}
                    <div className="flex items-center justify-between text-center font-bold text-lg text-foreground">
                      <div className="flex-1 text-left">{fx.homeTeam}</div>
                      <div className="px-3 text-xs font-mono text-muted-foreground">
                        VS
                      </div>
                      <div className="flex-1 text-right">{fx.awayTeam}</div>
                    </div>

                    {/* Cards Involved Footer */}
                    <div className="border-t border-border pt-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                        <Users className="size-3.5 text-primary" />
                        <span>
                          Giocatori in rosa coinvolti:{' '}
                          <strong className="text-foreground">
                            {totalInvolved}
                          </strong>
                        </span>
                      </div>

                      {totalInvolved > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {[...homeCards, ...awayCards].map((card) => (
                            <span
                              key={card.id}
                              className="rounded-lg bg-accent/60 border border-border px-2 py-1 text-[11px] font-medium text-foreground"
                            >
                              {card.playerName} ({card.position})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/gameweek')({
  component: GameWeekPage,
});