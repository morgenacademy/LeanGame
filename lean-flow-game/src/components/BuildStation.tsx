import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { Pile } from './Brick';
import { COLORS } from '../game/config';
import { COLOR_HEX, COLOR_LABEL } from '../game/colors';
import type { Color } from '../game/types';
import { BrickSvg, BuilderSvg } from './icons';

interface Drag {
  color: Color;
  x: number;
  y: number;
}

export function BuildStation() {
  const g = useGame((s) => s.g);
  const place = useGame((s) => s.place);

  const queue = g.stations[3].buffer;
  const holding = g.holding;
  const target = holding?.color ?? null;

  const [drag, setDrag] = useState<Drag | null>(null);

  // Schud alleen bij een échte nieuwe misdrop (delta op g.shake), niet bij remounts.
  const prevShake = useRef(g.shake);
  const [shakeAnim, setShakeAnim] = useState(false);
  useEffect(() => {
    if (g.shake !== prevShake.current) {
      prevShake.current = g.shake;
      setShakeAnim(true);
      const t = setTimeout(() => setShakeAnim(false), 320);
      return () => clearTimeout(t);
    }
  }, [g.shake]);

  // Slepen volgen + droppen op de bouwtekening (werkt voor muis én touch via pointer events).
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) =>
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const up = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el.closest('.dropzone')) place(drag.color);
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [drag, place]);

  return (
    <div className="station player-station">
      <div className="station-queue">
        <span className="queue-count">{queue.length}</span>
        <Pile items={queue} />
      </div>

      <div className="build-body">
        <div className="build-head">
          <div className="station-short">
            <span className="head-icon">
              <BuilderSvg width={18} height={18} />
            </span>
            Bouw <span className="you-badge">JIJ</span>
          </div>
        </div>

        {holding && target ? (
          <>
            <div className="assembly-label">
              Bouw dit huis:&nbsp;
              <span className="swatch" style={{ background: COLOR_HEX[target] }} />
              <strong>{COLOR_LABEL[target]}</strong>
              &nbsp;· {g.placedBricks}/{g.studsPerHouse}
            </div>

            <div className={`blueprint dropzone ${shakeAnim ? 'shake' : ''}`}>
              <HouseStages stage={g.placedBricks} color={target} size={108} />
            </div>

            <div className="tray">
              <span className="tray-label">⬆ sleep de juiste kleur omhoog</span>
              <div className="tray-bricks">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className="tray-brick"
                    style={{ color: COLOR_HEX[c] }}
                    aria-label={COLOR_LABEL[c]}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setDrag({ color: c, x: e.clientX, y: e.clientY });
                    }}
                  >
                    <BrickSvg width={40} height={24} style={{ display: 'block', pointerEvents: 'none' }} />
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="build-zone">
            <div className="waiting">
              <div className="waiting-title">Wachten op materiaal…</div>
              <div className="build-hint">upstream vult bij (WIP-limiet), de lijn stroomt nog</div>
            </div>
          </div>
        )}
      </div>

      {drag && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y, color: COLOR_HEX[drag.color] }}>
          <BrickSvg width={42} height={26} style={{ display: 'block' }} />
        </div>
      )}
    </div>
  );
}

/**
 * Het huis groeit in fases: elke geplaatste steen voegt een bouwlaag toe
 * (fundering -> muren -> muren+raam -> dak). Eerste-versie in code; later te
 * vervangen door house-stages.svg met groepen stage-1..stage-4.
 */
function HouseStages({ stage, color, size = 100 }: { stage: number; color: Color; size?: number }) {
  const hex = COLOR_HEX[color];
  const dark = 'rgba(0,0,0,0.32)';
  return (
    <svg viewBox="0 0 80 96" width={size * 0.83} height={size} style={{ display: 'block' }} aria-hidden>
      {/* bouwtekening-omtrek, altijd zichtbaar */}
      <g fill="none" stroke={hex} strokeOpacity="0.25" strokeWidth="2" strokeDasharray="3 3">
        <path d="M40 16 L72 40 H8 Z" />
        <rect x="16" y="40" width="48" height="44" />
        <rect x="10" y="84" width="60" height="8" />
      </g>
      {/* cumulatieve bouwfases */}
      {stage >= 1 && <rect className="hp" x="10" y="84" width="60" height="8" fill={dark} />}
      {stage >= 2 && <rect className="hp" x="16" y="62" width="48" height="22" fill={hex} />}
      {stage >= 3 && (
        <g className="hp">
          <rect x="16" y="40" width="48" height="22" fill={hex} />
          <rect x="22" y="45" width="11" height="11" fill={dark} />
          <rect x="35" y="64" width="13" height="20" fill={dark} />
        </g>
      )}
      {stage >= 4 && <path className="hp" d="M40 16 L72 40 H8 Z" fill={hex} />}
    </svg>
  );
}
