import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { Hud } from './Hud';
import { Station } from './Station';
import { BuildStation } from './BuildStation';
import { Narrator } from './Narrator';
import { MoneyFloats } from './MoneyFloats';
import { Brick } from './Brick';
import { RAW_SUPPLY, ROUNDS } from '../game/config';
import { COLOR_HEX } from '../game/colors';
import type { Color } from '../game/types';
import {
  SortColorSvg,
  SortSizeSvg,
  SetSvg,
  HouseSvg,
  CustomerSvg,
  beltTileUrl,
  floorTileUrl,
  hazardStripUrl,
  machineFrameUrl,
} from './icons';

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
  const lastDColor = g.stations[3].buffer[g.stations[3].buffer.length - 1]?.color ?? null;
  const lastBuilt = g.built[g.built.length - 1]?.color;

  return (
    <div className="board">
      <Hud />

      <div className="line" style={{ ['--machine' as string]: `url(${machineFrameUrl})` }}>
        <div className="factory-zone" style={{ backgroundImage: `url(${floorTileUrl})` }}>
          <div className="hazard-top" style={{ backgroundImage: `url(${hazardStripUrl})` }} />
          <Station
            name="Sorteren op kleur"
            short="Materiaal"
            queue={rawItems}
            blocked={g.stations[0].blocked}
            progress={prog(0)}
            icon={<SortColorSvg width={24} height={24} />}
            ai
          />
          <Belt trigger={g.stations[0].produced} kind="brick" />
          <Station
            name={g.stations[1].name}
            short={g.stations[1].short}
            queue={g.stations[1].buffer}
            blocked={g.stations[1].blocked}
            progress={prog(1)}
            icon={<SortSizeSvg width={24} height={24} />}
            ai
          />
          <Belt trigger={g.stations[1].produced} kind="brick" />
          <Station
            name={g.stations[2].name}
            short={g.stations[2].short}
            queue={g.stations[2].buffer}
            blocked={g.stations[2].blocked}
            progress={prog(2)}
            icon={<SetSvg width={24} height={24} />}
            ai
          />
          <Belt trigger={g.stations[2].produced} kind="brick" color={lastDColor} />
          <BuildStation />
        </div>
        <Belt trigger={g.metrics.housesBuilt} kind="house" color={lastBuilt} />
        <Market />
      </div>

      <Narrator />
      <MoneyFloats />
    </div>
  );
}

let beltSlideId = 0;

/** Lopende band tussen twee werkplekken. Elke keer dat `trigger` ophoogt (een stuk
 *  werk is afgeleverd) schuift er een item overheen. In pull (geknepen) dus rustiger. */
function Belt({ trigger, kind, color }: { trigger: number; kind: 'brick' | 'house'; color?: Color | null }) {
  const [slides, setSlides] = useState<{ id: number; color: Color | null }[]>([]);
  const prev = useRef(trigger);
  const colorRef = useRef<Color | null | undefined>(color);
  colorRef.current = color;

  useEffect(() => {
    if (trigger !== prev.current) {
      prev.current = trigger;
      const id = ++beltSlideId;
      const c = colorRef.current ?? null;
      setSlides((s) => [...s, { id, color: c }]);
      const t = setTimeout(() => setSlides((s) => s.filter((x) => x.id !== id)), 850);
      return () => clearTimeout(t);
    }
  }, [trigger]);

  return (
    <div className="belt" aria-hidden>
      <div className="belt-tread" style={{ backgroundImage: `url(${beltTileUrl})` }} />
      {slides.map((s) => (
        <span key={s.id} className="belt-item">
          {kind === 'house' ? (
            <HouseSvg
              width={15}
              height={18}
              style={{ color: s.color ? COLOR_HEX[s.color] : '#9b6fcf', display: 'block' }}
            />
          ) : (
            <Brick color={s.color} size={15} />
          )}
        </span>
      ))}
    </div>
  );
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
