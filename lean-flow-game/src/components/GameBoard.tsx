import { useGame } from '../game/store';
import { Hud } from './Hud';
import { Station } from './Station';
import { BuildStation } from './BuildStation';
import { Narrator } from './Narrator';
import { MoneyFloats } from './MoneyFloats';
import { RAW_SUPPLY, ROUNDS } from '../game/config';
import { COLOR_HEX } from '../game/colors';
import type { Color } from '../game/types';
import { SortColorSvg, SortSizeSvg, SetSvg, HouseSvg, CustomerSvg } from './icons';

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
        <div className="factory-zone">
        <Station
          name="Sorteren op kleur"
          short="Materiaal"
          queue={rawItems}
          blocked={g.stations[0].blocked}
          progress={prog(0)}
          icon={<SortColorSvg width={24} height={24} />}
          ai
        />
        <Arrow />
        <Station
          name={g.stations[1].name}
          short={g.stations[1].short}
          queue={g.stations[1].buffer}
          blocked={g.stations[1].blocked}
          progress={prog(1)}
          icon={<SortSizeSvg width={24} height={24} />}
          ai
        />
        <Arrow />
        <Station
          name={g.stations[2].name}
          short={g.stations[2].short}
          queue={g.stations[2].buffer}
          blocked={g.stations[2].blocked}
          progress={prog(2)}
          icon={<SetSvg width={24} height={24} />}
          ai
        />
        <Arrow />
        <BuildStation />
        </div>
        <Arrow />
        <Market />
      </div>

      <Narrator />
      <MoneyFloats />
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
      <div className={`demand-bubble ${g.demandRevealed ? 'known' : 'unknown'}`}>
        <span className="bubble-label">Klant wil</span>
        {g.demandRevealed && g.demandColor ? (
          <House color={g.demandColor} sold revealed={false} />
        ) : (
          <>
            <span className="bubble-q">?</span>
            <span className="bubble-sub">hoor je pas aan het eind</span>
          </>
        )}
      </div>
      <div className="station-queue market-houses">
        {shown.map((h) => (
          <House key={h.id} color={h.color} sold={h.sold} revealed={g.demandRevealed} />
        ))}
      </div>
      <div className="station-body market-body">
        <div className="market-awning" />
        <div className="market-customer">
          <CustomerSvg width={46} height={46} />
        </div>
        <div className="station-status market-score">
          {g.demandRevealed ? `${g.metrics.housesSold}/${g.metrics.housesBuilt} verkocht` : ''}
        </div>
      </div>
    </div>
  );
}

function House({ color, sold, revealed }: { color: Color; sold: boolean; revealed: boolean }) {
  const dim = revealed && !sold;
  return (
    <span className={`house ${dim ? 'unsold' : ''}`} title={revealed ? (sold ? 'verkocht' : 'onverkocht') : ''}>
      <HouseSvg width={18} height={22} style={{ color: COLOR_HEX[color], display: 'block' }} />
      {dim && <span className="house-x">✕</span>}
    </span>
  );
}
