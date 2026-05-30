import type { Color, RoundMode } from './types';

// Economie (illustratief: stenen/huis x $1 = kostprijs, huis = $25).
// Marge $13/huis: pull verkoopt vrijwel alles -> winst; push koopt RAW_SUPPLY sets
// in ongeacht de vraag -> grote overproductie-kost -> verlies. Flip is robuust.
export const COLORS: Color[] = ['red', 'blue', 'yellow', 'green'];
export const BRICKS_PER_HOUSE = 12;
export const HOUSE_PRICE = 25;

/** Aantal klikken om een huis te bouwen (de hands-on micro-taak). */
export const STUDS_PER_HOUSE = 4;

/** Het afgebouwde huis (met dak) blijft dit even staan vóór het naar de markt schuift. */
export const HOUSE_HOLD_MS = 650;

/** Pull: interval waarop de klantvraag van kleur wisselt. */
export const DEMAND_SWITCH_MS = 14000;

/** Tick-resolutie van de simulatie. */
export const TICK_MS = 100;

/** Maximaal materiaal dat per ronde uit de bak komt. Hoog genoeg dat push de hele
 *  ronde blijft overstromen (de bouwer kan het nooit bijbenen). Pull wordt door de
 *  WIP-limiet geknepen, dus daar raakt deze cap nooit op. */
export const RAW_SUPPLY = 36;

/** Namen van de vier stations in de lijn (Sato-rollen). */
export const STATION_DEFS = [
  { name: 'Sorteren op kleur', short: 'Kleur' },
  { name: 'Sorteren op kleur + maat', short: 'Maat' },
  { name: 'Set samenstellen', short: 'Set' },
  { name: 'Huis bouwen → markt', short: 'Bouw' },
] as const;

/** De speler bedient dit station (MVP: de bouwer). */
export const PLAYER_STATION_INDEX = 3;

export interface RoundConfig {
  mode: RoundMode;
  durationMs: number;
  /** WIP-limiet per buffer; null = ongelimiteerd (push). */
  wipLimit: number | null;
  /** Kent de speler de vraag-kleur vanaf de start? (pull = ja) */
  demandKnownAtStart: boolean;
  /** AI-cooldown (ms) per station 0..2. */
  stationCooldownMs: [number, number, number];
  title: string;
  subtitle: string;
  intro: string[];
}

// MVP = ronde 1 (push) en ronde 2 (pull). One-piece-flow + kaizen volgen later.
export const ROUNDS: RoundConfig[] = [
  {
    mode: 'push',
    durationMs: 60000,
    wipLimit: null,
    demandKnownAtStart: false,
    stationCooldownMs: [1000, 1100, 1200],
    title: 'Ronde 1',
    subtitle: 'Zo snel mogelijk',
    intro: [
      'Jij bent de bouwer, de laatste werkplek in de fabriek.',
      'De fabriek draait op volle kracht: ieder station maakt zoveel mogelijk, zo snel mogelijk.',
      'Jouw doel: lever zoveel mogelijk huizen die de klant koopt, en maak winst.',
      'Welke kleur de klant wil? Dat hoor je pas aan het eind, je bouwt dus blind.',
    ],
  },
  {
    mode: 'pull',
    durationMs: 60000,
    wipLimit: 1,
    demandKnownAtStart: true,
    stationCooldownMs: [1700, 1700, 1700],
    title: 'Ronde 2',
    subtitle: 'Op signaal van de klant',
    intro: [
      'Nieuwe regel: een station maakt pas iets als er stroomafwaarts ruimte is (WIP-limiet 1).',
      'De vraag-kleur van de klant zie je nu vanaf het begin (en wisselt soms).',
      'Bouw alleen wat de klant vraagt. Vaak sta je even stil, dat mag, het werk stroomt.',
    ],
  },
];
