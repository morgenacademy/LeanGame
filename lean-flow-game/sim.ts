// Headless balans-check: simuleert een modelspeler die elke `dragMs` één juiste
// steen plaatst. Geen UI. Doel: bevestigen dat push verlies geeft en pull winst,
// over verschillende speeltempo's.
import { makeRoundState, tick, placeBrick } from './src/game/engine';
import { ROUNDS, TICK_MS } from './src/game/config';

function simRound(idx: number, dragMs: number) {
  const s = makeRoundState(idx);
  s.running = true;
  s.phase = 'playing';
  let acc = 0;
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 100000) {
    tick(s, TICK_MS);
    if (s.phase !== 'playing') break;
    if (s.holding) {
      acc += TICK_MS;
      if (acc >= dragMs) {
        placeBrick(s, s.holding.color);
        acc = 0;
      }
    } else {
      acc = 0;
    }
  }
  return s.metrics;
}

for (const drag of [900, 1300, 1800]) {
  for (const idx of [0, 1]) {
    const m = simRound(idx, drag);
    console.log(
      `drag=${drag}ms ${m.mode.padEnd(4)} | gebouwd=${m.housesBuilt} verkocht=${m.housesSold} kost=$${m.cost} winst=$${m.profit} piekWIP=${m.peakWip}`
    );
  }
}
console.log('round durations:', ROUNDS.map((r) => r.durationMs));
