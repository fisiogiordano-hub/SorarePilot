export type GameWeekStatus = 'OPEN' | 'UPCOMING' | 'PAST';

export interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  competition: string;
}

export interface GameWeek {
  id: string;
  number: number;
  name: string;
  status: GameWeekStatus;
  startDate: string;
  endDate: string;
  fixtures: Fixture[];
}

const MOCK_GAMEWEEKS: GameWeek[] = [
  {
    id: 'gw-450',
    number: 450,
    name: 'Gameweek 450',
    status: 'OPEN',
    startDate: '2026-10-14T16:00:00Z',
    endDate: '2026-10-18T22:00:00Z',
    fixtures: [
      {
        id: 'fx-1',
        homeTeam: 'AC Milan',
        awayTeam: 'Inter',
        date: '2026-10-17T18:00:00Z',
        competition: 'Serie A',
      },
    ],
  },
  {
    id: 'gw-451',
    number: 451,
    name: 'Gameweek 451',
    status: 'UPCOMING',
    startDate: '2026-10-21T16:00:00Z',
    endDate: '2026-10-25T22:00:00Z',
    fixtures: [
      {
        id: 'fx-2',
        homeTeam: 'Inter',
        awayTeam: 'AC Milan',
        date: '2026-10-24T20:45:00Z',
        competition: 'Serie A',
      },
    ],
  },
];

const STORAGE_KEY = 'sorarepilot_gameweeks';

export const getLocalGameWeeks = (): GameWeek[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    saveLocalGameWeeks(MOCK_GAMEWEEKS);
    return MOCK_GAMEWEEKS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Errore nel parsing delle GameWeeks locali', e);
    return MOCK_GAMEWEEKS;
  }
};

export const saveLocalGameWeeks = (gameWeeks: GameWeek[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gameWeeks));
};

export const getCurrentGameWeek = (): GameWeek => {
  const gws = getLocalGameWeeks();
  return gws.find((gw) => gw.status === 'OPEN') || gws[0];
};