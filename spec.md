# Product Specification: Football Organizer Web App

## 1. Overview
### Purpose
This web app is designed to simplify the organization and management of friendly football (soccer) matches. It allows users to manage players, schedule matches, assign teams, track wins for a leaderboard, calculate financial obligations based on attendance, and mark payments. The app targets a single organizer (e.g., you) but could be extended for multi-user access in the future.

### Scope
- Core features: Player management, match creation and team assignment, leaderboard, payment tracking.
- Assumptions: 
  - Single-user app (no authentication required initially; add if needed later).
  - Data persistence is required (suggest using a simple database like SQLite via Bun's built-in support or Prisma ORM for ease).
  - Focus on functionality; UI should be clean and responsive using Shadcn/UI components.
- Out of Scope: 
  - Mobile app integration.
  - Email/SMS notifications.
  - Advanced analytics (e.g., player stats beyond wins).

### Target Users
- Primary: The organizer (you).
- Secondary: Players (view-only access could be added later, e.g., via shared links).

## 2. Technical Stack
- **Runtime**: BunJS (use the NextJS compatibility mode as detailed in https://bun.com/docs/guides/ecosystem/nextjs).
- **Framework**: NextJS (App Router for routing and pages).
- **UI Library**: Shadcn/UI with the following initialization command:
  ```
  bunx --bun shadcn@latest create --preset "https://ui.shadcn.com/init?base=radix&style=lyra&baseColor=stone&theme=amber&iconLibrary=tabler&font=jetbrains-mono&menuAccent=subtle&menuColor=default&radius=default&template=next" --template next
  ```
  Use components like Button, Table, DropdownMenu, Input, Select, etc., for a consistent, customizable UI.
- **Database**: SQLite (via Bun's sqlite module) for simplicity. Store data in a local file (e.g., `db.sqlite`). Use raw SQL or an ORM like Drizzle for queries.
- **State Management**: React hooks and Context API (no need for Redux unless complexity grows).
- **Deployment**: Local development; prepare for Vercel or similar if needed.
- **Other**: TypeScript for type safety. ESLint and Prettier for code quality.

## 3. Data Models
Define these as TypeScript interfaces/types and corresponding database schemas.

### Player
- `id`: Unique identifier (auto-increment integer).
- `name`: String (required, unique).
- `position`: Enum/string (one of: "Attack", "Midfield", "Defense").
- `wins`: Integer (default 0; incremented when their team wins a match).
- `totalOwed`: Float (calculated; sum of owed amounts from attended matches).
- `paid`: Boolean (default false; marks if all owed payments are settled).

### Match
- `id`: Unique identifier (auto-increment integer).
- `date`: Date (required; use ISO format).
- `price`: Float (required; total cost of the match, e.g., venue fee).
- `teamA`: Array of Player IDs.
- `teamB`: Array of Player IDs.
- `winner`: Enum/string (one of: "Team A", "Team B", "Draw", "Not Played" – default "Not Played").
- `attendees`: Derived (union of teamA and teamB players).

### Payment (optional separate table for audit trail)
- `id`: Unique identifier.
- `playerId`: Foreign key to Player.
- `matchId`: Foreign key to Match.
- `amountOwed`: Float (calculated as `match.price / totalAttendees` for that match).
- `paid`: Boolean (default false).

**Calculations**:
- For a match: `totalAttendees = teamA.length + teamB.length`.
- Player's `amountOwed` per match: `match.price / totalAttendees` if they attended.
- Player's `totalOwed`: Sum of unpaid `amountOwed` across all attended matches.
- Update `wins` after marking a winner: Increment for all players on the winning team.

**Database Schema Example** (SQLite):
```sql
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  position TEXT NOT NULL CHECK(position IN ('Attack', 'Midfield', 'Defense')),
  wins INTEGER DEFAULT 0,
  total_owed REAL DEFAULT 0.0,
  paid BOOLEAN DEFAULT FALSE
);

CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,  -- ISO date
  price REAL NOT NULL,
  team_a TEXT NOT NULL,  -- JSON array of player IDs
  team_b TEXT NOT NULL,  -- JSON array of player IDs
  winner TEXT DEFAULT 'Not Played' CHECK(winner IN ('Team A', 'Team B', 'Draw', 'Not Played'))
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  amount_owed REAL NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  FOREIGN KEY(player_id) REFERENCES players(id),
  FOREIGN KEY(match_id) REFERENCES matches(id)
);
```
Use JSON for team arrays in SQLite for simplicity.

## 4. Features and Requirements

### 4.1 Player Management
- **Add Player**:
  - Form with fields: Name (text input), Position (select dropdown with options: Attack, Midfield, Defense).
  - Validate: Name unique, position required.
  - UI: Use Shadcn Form, Input, Select.
- **List Players**:
  - Table view: Columns - Name, Position, Wins, Total Owed, Paid (checkbox or badge).
  - Actions: Edit, Delete.
- **Edit/Delete Player**:
  - Modal for edit; confirm dialog for delete (cascade to remove from matches/payments).

### 4.2 Match Creation and Management
- **Create Match**:
  - Form: Date (date picker), Price (number input).
  - UI: Shadcn DatePicker, Input.
- **List Matches**:
  - Table: Columns - Date, Price, Status (e.g., "Teams Assigned", "Played"), Winner.
  - Actions: Edit, Delete, Assign Teams, Mark Winner.
- **Assign Teams**:
  - For a match: Select available players (multi-select dropdown or drag-and-drop list).
  - Manual assignment: Add to Team A or Team B (no limit on team size).
  - Random button: Algorithm to balance teams:
    - Shuffle unassigned players (respects manually-placed players).
    - Assign to teams alternately, prioritizing position balance (e.g., aim for even distribution of Attack/Midfield/Defense across teams).
    - Balance team sizes as evenly as possible.
  - UI: Shadcn MultiSelect, Button for random, Accordion for team views.
- **Mark Winner**:
  - After teams assigned: Dropdown to select "Team A", "Team B", or "Draw".
  - On save: Update player wins (if not draw), calculate payments for attendees.

### 4.3 Leaderboard
- Dedicated page or section.
- Table sorted by wins descending: Columns - Rank, Player Name, Position, Wins.
- UI: Shadcn Table with sorting.

### 4.4 Payment Tracking
- **Owed Calculation**:
  - For each match: When teams are assigned and match is marked as played (winner set), create payment records for each attendee with `amountOwed = price / totalAttendees`.
  - Update player's `totalOwed` as sum of unpaid amounts.
- **Payments Table**:
  - Pivot table: Y-axis (rows) - Matches (by date).
  - X-axis (columns) - Player Names.
  - Cell values: Amount owed for that match (if attended), or "-" if not.
  - Footer row: Total owed per player.
  - UI: Shadcn Table; make it scrollable if many players/matches.
- **Mark Paid**:
  - Per player per match: Checkbox in the table to toggle `paid`.
  - Or bulk: Button to mark all for a player as paid, updating `player.paid`.
  - On mark paid: Subtract from `totalOwed`.

## 5. UI/UX Guidelines
- **Layout**: Sidebar navigation (Players, Matches, Leaderboard, Payments).
- **Pages**:
  - /players: List and add.
  - /matches: List, create, detail view for assignment.
  - /leaderboard.
  - /payments: The table view.
- **Responsiveness**: Mobile-friendly; use Shadcn's responsive components.
- **Error Handling**: Toast notifications for success/errors (use Shadcn Toast).
- **Accessibility**: Follow ARIA standards via Shadcn.
- **Theme**: As per the Shadcn init command (Lyra style, Amber theme, etc.).

## 6. Non-Functional Requirements
- **Performance**: Local DB, so fast; optimize queries for large player/match lists.
- **Security**: No auth yet; add JWT if multi-user.
- **Testing**: Unit tests for calculations (e.g., team randomizer, owed amounts). Integration tests for forms.
- **Logging**: Console logs for debugging.
- **Backup**: Simple export to JSON/CSV for data.

## 7. Development Milestones
1. Set up project with BunJS + NextJS + Shadcn/UI.
2. Implement data models and DB.
3. Build Player management.
4. Build Match creation + team assignment.
5. Implement Leaderboard.
6. Build Payments table + marking.
7. Polish UI and test end-to-end.
