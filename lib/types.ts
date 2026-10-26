export type Position = "Attack" | "Midfield" | "Defense";

export type Winner = "Team A" | "Team B" | "Draw" | "Not Played";

export type SeasonStatus = "active" | "closed";

export interface Player {
  id: number;
  name: string;
  position: Position;
  points: number;
  totalOwed: number;
  paid: boolean;
  active: boolean;
}

export interface Match {
  id: number;
  seasonId: number;
  date: string;
  time: string;
  price: number;
  location: string;
  pitch: string;
  teamA: number[];
  teamB: number[];
  winner: Winner;
  scoreA: number | null;
  scoreB: number | null;
}

export interface Season {
  id: number;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  status: SeasonStatus;
  closedAt: number | null;
  matchCount: number;
  completedMatchCount: number;
}

export interface Payment {
  id: number;
  playerId: number;
  matchId: number;
  amountOwed: number;
  paid: boolean;
}

export interface CreatePlayerInput {
  name: string;
  position: Position;
}

export interface UpdatePlayerInput {
  name?: string;
  position?: Position;
  active?: boolean;
}

export interface CreateMatchInput {
  date: string;
  time: string;
  price: number;
  location?: string;
  pitch?: string;
}

export interface UpdateMatchInput {
  date?: string;
  time?: string;
  price?: number;
  location?: string;
  pitch?: string;
}

export interface AssignTeamsInput {
  teamA: number[];
  teamB: number[];
}

export interface SetWinnerInput {
  winner: Winner;
}

export type FormResult = "W" | "D" | "L";

export interface LeaderboardEntry {
  rank: number;
  playerId: number;
  name: string;
  points: number;
  matchesPlayed: number;
  avgPointsPerMatch: number;
  lastPlayedDate: string | null;
  winRate: number;
  wins: number;
  draws: number;
  losses: number;
  form: FormResult[];
}

export interface TeamRecord {
  appearances: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
}

export interface PlayerAward {
  playerId: number;
  name: string;
  value: number;
}

export interface DuoStats {
  playerIds: [number, number];
  names: [string, string];
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
}

export interface PersonalRoundup {
  playerId: number;
  name: string;
  appearances: number;
  attendanceRank: number;
  points: number;
  leaderboardRank: number;
  avgPointsPerMatch: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  form: FormResult[];
  light: TeamRecord;
  dark: TeamRecord;
  bestPartners: DuoStats[];
  worstPartners: DuoStats[];
}

export interface SeasonRoundup {
  season: Pick<Season, "id" | "name" | "slug" | "startDate" | "endDate" | "closedAt">;
  generatedAt: number;
  totals: {
    matchesPlayed: number;
    uniquePlayers: number;
    totalAppearances: number;
  };
  leaderboard: LeaderboardEntry[];
  champions: PlayerAward[];
  podium: LeaderboardEntry[];
  mostAppearances: PlayerAward[];
  teamSplit: {
    lightWins: number;
    darkWins: number;
    draws: number;
    lightWinPercentage: number;
    darkWinPercentage: number;
    drawPercentage: number;
  };
  bestWinRate: PlayerAward[];
  worstWinRate: PlayerAward[];
  bestDuos: DuoStats[];
  worstDuos: DuoStats[];
  players: PersonalRoundup[];
}

export interface PaymentCell {
  playerId: number;
  matchId: number;
  amountOwed: number;
  paid: boolean;
}

export interface PaymentMatrix {
  players: Pick<Player, "id" | "name">[];
  matches: Pick<Match, "id" | "date" | "time" | "price">[];
  payments: PaymentCell[];
  totals: { playerId: number; totalOwed: number }[];
}
