import { useGame } from '../game/store';
import { Hud } from './Hud';
import { Station } from './Station';
import { BuildStation } from './BuildStation';
import { RAW_SUPPLY } from '../game/config';
import { COLOR_HEX } from '../game/colors';
import type { Color } from '../game/types';

export function GameBoard() {
  const g = useGame((s) => s.g);
  const rawLeft = Math.max(0, RAW_SUPPLY - g.rawReleased);

  return (
    <div className="board">
      <Hud />

      <div className="line">
        <Station
          name="Sorteren op kleur"
          short="Materiaal"
          queue={Array.from({ length: rawLeft }, () => null)}
          blocked={g.stations[0].blocked}
          ai
        />
        <Arrow />
        <Station
          name={g.stations[1].name}
          short={g.stations[1].short}
          queue={g.stations[1].buffer.map((u) => u.color)}
          blocked={g.stations[1].blocked}
          ai
        />
        <Arrow />
        <Station
          name={g.stations[2].name}
          short={g.stations[2].short}
          queue={g.stations[2].buffer.map((u) => u.color)}
          blocked={g.stations[2].blocked}
          ai
        />
        <Arrow />
        <BuildStation />
        <Arrow />
        <Market />
      </div>
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
