import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
type GameWeek = any;
type Fixture = any;
import {
  getLocalGameWeeks,
  getCurrentGameWeek,
} from '../lib/gameweek-service';
import { getLocalCards } from '../lib/collection-service';
import type { UserCard } from '../lib/collection-service';
import { Trophy, Clock, Users, Swords, CloudSun } from 'lucide-react';

function getFixtureWeather(fx: Fixture, idx: number) {
  const presets = [
    { condition: 'Sereno', temp: '16°C', wind: '11 km/h', rain: '10%' },
    { condition: 'Nuvoloso', temp: '13°C', wind: '16 km/h', rain: '25%' },
    { condition: 'Pioggia leggera', temp: '11°C', wind: '22 km/h', rain: '70%' },
    { condition: 'Poco nuvoloso', temp: '15°C', wind: '14 km/h', rain: '15%' },
  ];
  const base = presets[idx % presets.length];
  return {
    location: fx.venue || fx.city || fx.stadium || `${fx.homeTeam} Stadium`,
    ...base,
  };
}

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

  const fixtures: Fixture[] = selectedGw?.fixtures ?? [];

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
            Consulta le partite in arrivo, i match-up e le condizioni meteo.
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
        <div className="space-y-8">
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
                <strong className="text-foreground">{fixtures.length}</strong>
              </span>
            </div>
          </div>

          {/* Sezione 1: Match-up */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Swords className="size-4 text-primary" />
              <h3 className="text-sm font-mono uppercase text-muted-foreground">
                Match-up
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {fixtures.map((fx: Fixture) => {
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
                      <div className="flex-1 text-left">
                        <div>{fx.homeTeam}</div>
                        <div className="text-[11px] font-mono font-normal text-muted-foreground">
                          Casa ({homeCards.length} carte)
                        </div>
                      </div>
                      <div className="px-3 text-xs font-mono text-muted-foreground">
                        VS
                      </div>
                      <div className="flex-1 text-right">
                        <div>{fx.awayTeam}</div>
                        <div className="text-[11px] font-mono font-normal text-muted-foreground">
                          Trasferta ({awayCards.length} carte)
                        </div>
                      </div>
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
          </section>

          {/* Sezione 2: Meteo */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CloudSun className="size-4 text-primary" />
              <h3 className="text-sm font-mono uppercase text-muted-foreground">
                Meteo
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fixtures.map((fx: Fixture, idx: number) => {
                const weather = getFixtureWeather(fx, idx);

                return (
                  <div
                    key={`weather-${fx.id}`}
                    className="rounded-xl border border-border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {fx.homeTeam} vs {fx.awayTeam}
                      </span>
                      <span className="rounded-md bg-accent px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                        {weather.temp}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {weather.location} · <strong className="text-foreground">{weather.condition}</strong>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-2 font-mono text-[11px] text-muted-foreground">
                      <span>Pioggia: {weather.rain}</span>
                      <span>Vento: {weather.wind}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/gameweek')({
  component: GameWeekPage,
});