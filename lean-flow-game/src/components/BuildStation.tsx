import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { Brick, Pile } from './Brick';
import { COLORS } from '../game/config';
import { COLOR_HEX, COLOR_LABEL } from '../game/colors';
import type { Color } from '../game/types';
import { BuilderSvg, HouseStagesSvg } from './icons';

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
        <div className="robot-arm" aria-hidden>
          <span className="robot-joint" />
          <span className="robot-boom" />
          <span className="robot-claw" />
        </div>
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
                    <Brick color={c} size={34} />
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
          <Brick color={drag.color} size={38} />
        </div>
      )}
    </div>
  );
}

/**
 * Het huis groeit in fases: per geplaatste steen tonen we een extra bouwgroep
 * (stage-1..4) uit house-stages.svg. De ghost-laag toont vaag het hele huis als
 * bouwtekening, zodat je het doel ziet.
 */
function HouseStages({ stage, color, size = 100 }: { stage: number; color: Color; size?: number }) {
  return (
    <div
      className="house-stages-wrap"
      style={{ color: COLOR_HEX[color], width: size * 0.83, height: size }}
    >
      <HouseStagesSvg className="house-ghost" />
      <HouseStagesSvg key={stage} className={`house-built s${stage}`} />
    </div>
  );
}
