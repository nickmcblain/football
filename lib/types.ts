export type Position = "Attack" | "Midfield" | "Defense";

export type Winner = "Team A" | "Team B" | "Draw" | "Not Played";

export interface Player {
  id: number;
  name: string;
  position: Position;
  points: number;
  totalOwed: number;
  paid: boolean;
}

export interface Match {
  id: number;
  date: string;
  time: string;
  price: number;
  location: string;
  pitch: string;
  teamA: number[];
  teamB: number[];
  winner: Winner;
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
