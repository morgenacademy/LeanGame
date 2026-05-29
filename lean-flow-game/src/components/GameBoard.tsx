import { useGame } from '../game/store';
import { Hud } from './Hud';
import { Station } from './Station';
import { BuildStation } from './BuildStation';
import { Narrator } from './Narrator';
import { RAW_SUPPLY, ROUNDS } from '../game/config';
import { COLOR_HEX } from '../game/colors';
import type { Color } from '../game/types';

export function GameBoard() {
  const g = useGame((s) => s.g);
  const cfg = ROUNDS[g.roundIndex];
  const rawLeft = Math.max(0, RAW_SUPPLY - g.rawReleased);

  // Voortgang van een AI-station naar zijn volgende handeling (0..1).
  const prog = (i: number) => {
    const max = cfg.stationCooldownMs[i];
    return max > 0 ? Math.min(1, Math.max(0, 1 - g.stations[i].cooldownMs / max)) : 0;
  };

  const rawItems = Array.from({ length: rawLeft }, (_, i) => ({ id: -1 - i, color: null }));

  return (
    <div className="board">
      <Hud />

      <div className="line">
        <Station
          name="Sorteren op kleur"
          short="Materiaal"
          queue={rawItems}
          blocked={g.stations[0].blocked}
          progress={prog(0)}
          ai
        />
        <Arrow />
        <Station
          name={g.stations[1].name}
          short={g.stations[1].short}
          queue={g.stations[1].buffer}
          blocked={g.stations[1].blocked}
          progress={prog(1)}
          ai
        />
        <Arrow />
        <Station
          name={g.stations[2].name}
          short={g.stations[2].short}
          queue={g.stations[2].buffer}
          blocked={g.stations[2].blocked}
          progress={prog(2)}
          ai
        />
        <Arrow />
        <BuildStation />
        <Arrow />
        <Market />
      </div>

      <Narrator />
    </div>
  );
}

function Arrow() {
  return <div className="flow-arrow">→</div>;
}

function Market() {
  const g = useGame((s) => s.g);
  const houses = g.built;
  const shown = houses.slice(-12);
  return (
    <div className="station market">
      <div className="station-queue market-houses">
        {houses.length === 0 && <span className="pile-empty">nog niets geleverd</span>}
        {shown.map((h) => (
          <House key={h.id} color={h.color} sold={h.sold} revealed={g.demandRevealed} />
        ))}
      </div>
      <div className="station-body">
        <div className="station-short">Markt</div>
        <div className="station-name">De klant</div>
        <div className="station-status market-score">
          {g.demandRevealed ? `${g.metrics.housesSold}/${g.metrics.housesBuilt} verkocht` : 'vraag onbekend'}
        </div>
      </div>
    </div>
  );
}

function House({ color, sold, revealed }: { color: Color; sold: boolean; revealed: boolean }) {
  const dim = revealed && !sold;
  return (
    <span className={`house ${dim ? 'unsold' : ''}`} title={revealed ? (sold ? 'verkocht' : 'onverkocht') : ''}>
      <span className="house-roof" style={{ borderBottomColor: COLOR_HEX[color] }} />
      <span className="house-body" style={{ background: COLOR_HEX[color] }} />
      {dim && <span className="house-x">✕</span>}
    </span>
  );
}
