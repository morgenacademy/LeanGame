// Pure simulatie-logica. Geen React, geen side effects buiten de meegegeven state.
// De store kloont de state vóór elke tick, dus functies hier mogen `s` muteren.

import {
  ROUNDS,
  STATION_DEFS,
  COLORS,
  BRICKS_PER_HOUSE,
  HOUSE_PRICE,
  STUDS_PER_HOUSE,
  RAW_SUPPLY,
  PLAYER_STATION_INDEX,
  HOUSE_HOLD_MS,
  DEMAND_SWITCH_MS,
  type RoundConfig,
} from './config';
import type { Color, GameState, RoundMetrics, StationState } from './types';

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function emptyMetrics(mode: RoundConfig['mode']): RoundMetrics {
  return {
    mode,
    bricksConsumed: 0,
    housesBuilt: 0,
    housesSold: 0,
    housesUnsold: 0,
    misdrops: 0,
    peakWip: 0,
    firstHouseMs: null,
    revenue: 0,
    cost: 0,
    profit: 0,
  };
}

/** Bouwt een verse, speelklare state voor de gegeven ronde. */
export function makeRoundState(roundIndex: number, prevResults: RoundMetrics[] = []): GameState {
  const cfg = ROUNDS[roundIndex];
  const stations: StationState[] = STATION_DEFS.map((d, i) => ({
    index: i,
    name: d.name,
    short: d.short,
    buffer: [],
    cooldownMs: i < 3 ? cfg.stationCooldownMs[i] : 0,
    blocked: false,
    justActed: false,
    produced: 0,
    isPlayer: i === PLAYER_STATION_INDEX,
  }));

  const demandColor = cfg.demandKnownAtStart ? rand(COLORS) : null;

  return {
    phase: 'playing',
    roundIndex,
    mode: cfg.mode,
    elapsedMs: 0,
    roundDurationMs: cfg.durationMs,
    running: false,
    stations,
    built: [],
    demandColor,
    demandRevealed: cfg.demandKnownAtStart,
    holding: null,
    placedBricks: 0,
    studsPerHouse: STUDS_PER_HOUSE,
    shake: 0,
    houseCompleteAtMs: null,
    nextDemandSwitchMs: 12000,
    nextUnitId: 1,
    nextHouseId: 1,
    rawReleased: 0,
    metrics: emptyMetrics(cfg.mode),
    roundResults: prevResults,
  };
}

/** Probeert station `i` (0..2, de AI-stations) één stuk werk te laten verwerken. */
function tryProcess(s: GameState, i: number, cfg: RoundConfig): boolean {
  const wip = cfg.wipLimit;

  if (i === 0) {
    // Worker 0: haalt materiaal uit de (eindige) bak en geeft het vrij in de lijn.
    if (s.rawReleased >= RAW_SUPPLY) return false;
    const next = s.stations[1].buffer;
    if (wip != null && next.length >= wip) return false;
    next.push({ id: s.nextUnitId++, color: null, startedAtMs: s.elapsedMs });
    s.rawReleased++;
    // Eén zichtbaar onderdeel is een kwart huis-set; economisch telt het als
    // 3 echte steentjes wanneer BRICKS_PER_HOUSE = 12 en STUDS_PER_HOUSE = 4.
    s.metrics.bricksConsumed += BRICKS_PER_HOUSE / STUDS_PER_HOUSE;
    return true;
  }

  if (i === 1) {
    const inp = s.stations[1].buffer;
    if (inp.length === 0) return false;
    const next = s.stations[2].buffer;
    if (wip != null && next.length >= wip) return false;
    next.push(inp.shift()!);
    return true;
  }

  // i === 2: set samenstellen + kleur toekennen. Een set bestaat uit 4
  // onderdelen; pas als die voorraad er ligt komt er één set uit.
  const inp = s.stations[2].buffer;
  if (inp.length < STUDS_PER_HOUSE) return false;
  const next = s.stations[3].buffer;
  if (wip != null && next.length >= wip) return false;
  const parts = inp.splice(0, STUDS_PER_HOUSE);
  const first = parts[0]!;
  const u = { id: first.id, color: first.color, startedAtMs: first.startedAtMs };
  // Pull: maak wat de klant vraagt. Push: gok een kleur (geen vraag bekend).
  u.color = cfg.mode === 'pull' ? s.demandColor ?? rand(COLORS) : rand(COLORS);
  next.push(u);
  return true;
}

/** Eén simulatiestap. */
export function tick(s: GameState, dt: number): void {
  if (!s.running || s.phase !== 'playing') return;
  const cfg = ROUNDS[s.roundIndex];
  s.elapsedMs += dt;

  for (const st of s.stations) {
    st.justActed = false;
    st.blocked = false;
  }

  for (let i = 0; i < 3; i++) {
    const st = s.stations[i];
    st.cooldownMs -= dt;
    if (st.cooldownMs > 0) continue;
    if (tryProcess(s, i, cfg)) {
      st.cooldownMs = cfg.stationCooldownMs[i];
      st.justActed = true;
      st.produced++;
    } else {
      st.blocked = true;
      st.cooldownMs = 0; // klaar, maar geblokkeerd: probeer volgende tick opnieuw
    }
  }

  // Dak-moment: een compleet huis blijft heel even staan (met dak) en schuift
  // daarna pas naar de markt. De volgende set blijft zichtbaar in de voorraad
  // totdat de speler die zelf oppakt.
  if (s.houseCompleteAtMs != null && s.elapsedMs - s.houseCompleteAtMs >= HOUSE_HOLD_MS) {
    shipHouse(s);
  }

  // Pull: de klant verandert af en toe van wens. In kanban maak je wat NU gevraagd
  // wordt, dus herkleuren we de sets die al onderweg zijn naar de nieuwe wens
  // (anders bouw je iets dat de klant niet meer wil = alsnog verspilling).
  if (cfg.mode === 'pull' && s.elapsedMs >= s.nextDemandSwitchMs) {
    let next = rand(COLORS);
    while (next === s.demandColor) next = rand(COLORS);
    s.demandColor = next;
    s.nextDemandSwitchMs = s.elapsedMs + DEMAND_SWITCH_MS;
    for (const u of s.stations[2].buffer) if (u.color) u.color = next;
    for (const u of s.stations[3].buffer) u.color = next;
    // Ook het huis-in-aanbouw volgt de nieuwe wens (compleet+wachtend huis niet:
    // dat is al af en wordt zo geleverd).
    if (s.holding && s.houseCompleteAtMs == null) s.holding.color = next;
  }

  const wipNow =
    s.stations[1].buffer.length +
    s.stations[2].buffer.length +
    s.stations[3].buffer.length +
    (s.holding ? 1 : 0);
  if (wipNow > s.metrics.peakWip) s.metrics.peakWip = wipNow;

  if (s.elapsedMs >= s.roundDurationMs) endRound(s);
}

/**
 * Speler sleept een onderdeel naar de bouwvakken. Alleen de juiste kleur telt;
 * een verkeerde kleur is verspilde beweging (rework). Bij de laatste juiste
 * steen gaat het huis naar de markt.
 */
export function placeBrick(s: GameState, color: Color): void {
  if (s.phase !== 'playing' || !s.running) return;
  if (s.houseCompleteAtMs != null) return; // huis is af en wacht op de markt

  if (!s.holding) {
    const nextSet = s.stations[3].buffer.shift();
    if (!nextSet) return;
    s.holding = nextSet;
    s.placedBricks = 0;
  }

  if (color === s.holding.color) {
    s.placedBricks++;
    // Laatste steen: huis is compleet (dak erop). Het blijft even staan en schuift
    // dan via de tick naar de markt (shipHouse).
    if (s.placedBricks >= s.studsPerHouse) s.houseCompleteAtMs = s.elapsedMs;
  } else {
    s.metrics.misdrops++;
    s.shake++;
  }
}

/**
 * Legt vast één set in handen van de bouwer, zodat tijdens de walkthrough de
 * echte bouw-UI (voorraad + bouwvakken) al zichtbaar is. Kosten worden gewoon geteld.
 */
export function seedHolding(s: GameState): void {
  if (s.holding) return;
  const cfg = ROUNDS[s.roundIndex];
  const color = cfg.mode === 'pull' ? s.demandColor ?? rand(COLORS) : rand(COLORS);
  s.holding = { id: s.nextUnitId++, color, startedAtMs: 0 };
  s.placedBricks = 0;
  s.metrics.bricksConsumed += BRICKS_PER_HOUSE;
}

function shipHouse(s: GameState): void {
  const u = s.holding!;
  const color = (u.color ?? COLORS[0]) as Color;
  const sold = s.demandRevealed && s.demandColor != null ? color === s.demandColor : false;
  s.built.push({ id: s.nextHouseId++, color, builtAtMs: s.elapsedMs, sold });
  s.metrics.housesBuilt++;
  if (s.metrics.firstHouseMs == null) s.metrics.firstHouseMs = s.elapsedMs;
  if (sold) {
    s.metrics.housesSold++;
    s.metrics.revenue += HOUSE_PRICE;
  }
  s.holding = null;
  s.placedBricks = 0;
  s.houseCompleteAtMs = null;
  // De volgende set blijft in de voorraad tot de speler die zelf oppakt.
}

function endRound(s: GameState): void {
  s.running = false;
  const cfg = ROUNDS[s.roundIndex];

  if (cfg.mode === 'push') {
    // De klap: pas nu blijkt welke kleur de klant wilde.
    s.demandColor = rand(COLORS);
    s.demandRevealed = true;
    let sold = 0;
    for (const h of s.built) {
      h.sold = h.color === s.demandColor;
      if (h.sold) sold++;
    }
    s.metrics.housesSold = sold;
    s.metrics.revenue = sold * HOUSE_PRICE;
  }

  s.metrics.housesUnsold = s.metrics.housesBuilt - s.metrics.housesSold;
  s.metrics.cost = s.metrics.bricksConsumed; // $1 per steen
  s.metrics.profit = s.metrics.revenue - s.metrics.cost;
  s.phase = 'debrief';
}
