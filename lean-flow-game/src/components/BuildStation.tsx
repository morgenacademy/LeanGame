import { useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { Brick, Pile } from './Brick';
import { COLORS } from '../game/config';
import { COLOR_HEX, COLOR_LABEL } from '../game/colors';
import type { Color } from '../game/types';

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

  const demand = g.demandRevealed && g.demandColor ? g.demandColor : null;

  return (
    <div className="station player-station">
      <div className="station-queue">
        <span className="queue-count">{queue.length}</span>
        <Pile items={queue} />
      </div>

      <div className="build-body">
        <div className="build-head">
          <div className="station-short">
            Bouw <span className="you-badge">JIJ</span>
          </div>
          <div className="demand-chip">
            Klant wil:&nbsp;
            {demand ? (
              <>
                <span className="swatch" style={{ background: COLOR_HEX[demand] }} />
                {COLOR_LABEL[demand]}
              </>
            ) : (
              <>
                <strong>?</strong>
                <span className="hint-mini">&nbsp;nog onbekend</span>
              </>
            )}
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

            <div key={g.shake} className={`blueprint dropzone ${g.shake > 0 ? 'shake' : ''}`}>
              {Array.from({ length: g.studsPerHouse }).map((_, i) =>
                i < g.placedBricks ? (
                  <span key={`f${i}`} className="brick-wrap">
                    <Brick color={target} size={36} />
                  </span>
                ) : (
                  <span key={`s${i}`} className="slot-ghost" style={{ borderColor: COLOR_HEX[target] }} />
                )
              )}
            </div>

            <div className="tray">
              <span className="tray-label">⬆ sleep de juiste kleur omhoog</span>
              <div className="tray-bricks">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className="tray-brick"
                    style={{ background: COLOR_HEX[c] }}
                    aria-label={COLOR_LABEL[c]}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setDrag({ color: c, x: e.clientX, y: e.clientY });
                    }}
                  >
                    <span className="stud" />
                    <span className="stud" />
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="build-zone">
            <div className="waiting">
              <div className="waiting-title">Wachten op materiaal…</div>
              <div className="build-hint">upstream vult bij (WIP-limiet) — de lijn stroomt nog</div>
            </div>
          </div>
        )}
      </div>

      {drag && (
        <div
          className="drag-ghost"
          style={{ left: drag.x, top: drag.y, background: COLOR_HEX[drag.color] }}
        >
          <span className="stud" />
          <span className="stud" />
        </div>
      )}
    </div>
  );
}
