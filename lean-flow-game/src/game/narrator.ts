// De narrator: een coach die je stap voor stap binnenloodst en reageert op wat er
// op de werkvloer gebeurt. Volledig afgeleid van de game-state (pure functie), dus
// geen extra geheugen nodig: de boodschap volgt vanzelf de toestand.

import { COLOR_LABEL } from './colors';
import type { GameState } from './types';

export type NarratorTone = 'guide' | 'cheer' | 'warn' | 'calm';

export interface NarratorLine {
  id: string; // stabiele sleutel zodat de bar alleen bij échte wissels opnieuw animeert
  text: string;
  tone: NarratorTone;
}

export function narrate(g: GameState): NarratorLine | null {
  if (g.phase !== 'playing') return null;

  const d = g.stations[3].buffer.length;
  const wip =
    g.stations[1].buffer.length + g.stations[2].buffer.length + d + (g.holding ? 1 : 0);
  const holding = !!g.holding;
  const built = g.metrics.housesBuilt;
  const frac = g.elapsedMs / g.roundDurationMs;
  const last = g.built[g.built.length - 1];
  const recentBuild = !!last && g.elapsedMs - last.builtAtMs < 2600;

  const line = (id: string, text: string, tone: NarratorTone): NarratorLine => ({ id, text, tone });

  if (g.mode === 'push') {
    // Begeleide start
    if (built === 0 && !holding && d === 0 && g.elapsedMs < 9000)
      return line('p-welcome', 'Welkom op de werkvloer. Jij bent de bouwer. Zo komt je eerste set binnen…', 'guide');
    if (built === 0 && (holding || d > 0))
      return line('p-place', 'Bouw dit huis: sleep onderdelen uit jouw set naar de bouwvakken.', 'guide');
    if (built === 1 && recentBuild)
      return line('p-first', 'Je eerste huis! Het ging naar de markt. Maar… weet je eigenlijk wélke kleur de klant wil?', 'cheer');

    // Reactieve coach
    if (wip >= 6)
      return line('p-pile', 'Zie je het opstapelen? Er komt méér binnen dan jij kunt bouwen, en niemand stopt. Dit is push.', 'warn');
    if (frac > 0.8)
      return line('p-end', 'Bijna klaar… zo dadelijk blijkt pas wat de klant écht wilde.', 'guide');
    if (recentBuild) return line('p-go', 'En door! Blijf bouwen, zoveel je kunt.', 'cheer');
    return line('p-build', 'Bouw zoveel mogelijk huizen. Tempo, tempo!', 'guide');
  }

  // Pull (ronde 2)
  const demand = g.demandColor ? COLOR_LABEL[g.demandColor].toLowerCase() : 'de gevraagde kleur';
  if (g.elapsedMs < 6500)
    return line('q-rules', `Nieuwe regels. Maak alléén wat de klant vraagt: ${demand}.`, 'calm');
  if (!holding && d === 0)
    return line('q-wait', 'Even niets te doen? Dat mág. Je wacht op een signaal, het werk stroomt nog steeds.', 'calm');
  if (holding || d > 0) return line('q-place', 'Sleep onderdelen naar de bouwvakken; dit huis is verkocht zodra het af is.', 'guide');
  if (recentBuild) return line('q-sold', 'Verkocht. Geen voorraad, geen verspilling.', 'cheer');
  return line('q-calm', 'Rustig, op het ritme van de klant. Merk je hoeveel kalmer het is?', 'calm');
}
