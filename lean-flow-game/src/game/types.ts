// Domeinmodel voor de Lean flow-simulatie.
// Bewust framework-onafhankelijk: alleen data + (in engine.ts) pure functies.

export type Color = 'red' | 'blue' | 'yellow' | 'green';

/** Spelregime van een ronde. */
export type RoundMode = 'push' | 'pull';

/** Waar de speler zich in de flow bevindt. */
export type Phase = 'start' | 'round-intro' | 'playing' | 'debrief' | 'finished';

/** Eén "huis-waardig" stuk werk dat door de lijn stroomt. */
export interface Unit {
  id: number;
  /** Kleur wordt pas toegekend bij station 3 ("set kiezen"). */
  color: Color | null;
  /** elapsedMs op het moment dat het materiaal werd vrijgegeven (voor lead time). */
  startedAtMs: number;
}

/** Een gebouwd huis dat naar de markt is gegaan. */
export interface BuiltHouse {
  id: number;
  color: Color;
  builtAtMs: number;
  sold: boolean;
}

/** Toestand van één werkstation in de lijn. */
export interface StationState {
  index: number;
  name: string;
  short: string;
  /** Inkomende buffer: werk dat wacht om door dit station verwerkt te worden (= zichtbare WIP). */
  buffer: Unit[];
  /** Resterende cooldown (ms) tot dit station weer mag verwerken. */
  cooldownMs: number;
  /** True als dit station deze tick klaar was maar niet kon werken (geen input of WIP-limiet). */
  blocked: boolean;
  /** Heeft dit station deze tick daadwerkelijk iets verwerkt? (voor een korte puls-animatie) */
  justActed: boolean;
  /** De speler bedient dit station handmatig. */
  isPlayer: boolean;
}

/** Meetwaarden van één ronde. */
export interface RoundMetrics {
  mode: RoundMode;
  bricksConsumed: number; // aantal vrijgegeven units * stenen-per-huis
  housesBuilt: number;
  housesSold: number;
  housesUnsold: number;
  peakWip: number;
  firstHouseMs: number | null;
  revenue: number;
  cost: number;
  profit: number;
}

export interface GameState {
  phase: Phase;
  roundIndex: number;
  mode: RoundMode;

  elapsedMs: number;
  roundDurationMs: number;
  running: boolean;

  stations: StationState[];
  built: BuiltHouse[]; // markt: deze ronde gebouwde huizen
  demandColor: Color | null;
  demandRevealed: boolean; // push: pas waar aan het einde

  // Handmatige bouw door de speler
  holding: Unit | null;
  placedBricks: number;
  studsPerHouse: number;

  // Tellers voor unieke id's
  nextUnitId: number;
  nextHouseId: number;
  rawReleased: number; // hoeveel raw-materiaal al is vrijgegeven (cap per ronde)

  // Loopende metrics + afgeronde rondes
  metrics: RoundMetrics;
  roundResults: RoundMetrics[];
}
