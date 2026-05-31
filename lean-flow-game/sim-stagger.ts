import { makeRoundState, tick } from './src/game/engine';

const s = makeRoundState(0);
s.running = true;
s.phase = 'playing';
const fires: number[][] = [[], [], []];
for (let t = 0; t < 6000; t += 100) {
  const before = s.stations.map((x) => x.produced);
  tick(s, 100);
  s.stations.slice(0, 3).forEach((x, i) => {
    if (x.produced > before[i]) fires[i].push(t);
  });
}
console.log('station0 (materiaal) fires ms:', fires[0].slice(0, 6));
console.log('station1 (maat)      fires ms:', fires[1].slice(0, 6));
console.log('station2 (set)       fires ms:', fires[2].slice(0, 6));
