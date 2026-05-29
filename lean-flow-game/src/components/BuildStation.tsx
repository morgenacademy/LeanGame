import { useCallback, useEffect } from 'react';
import { useGame } from '../game/store';
import { Brick, Pile } from './Brick';
import { COLOR_HEX, COLOR_LABEL } from '../game/colors';

export function BuildStation() {
  const g = useGame((s) => s.g);
  const grab = useGame((s) => s.grab);
  const place = useGame((s) => s.place);

  const queue = g.stations[3].buffer;
  const holding = g.holding;

  const tap = useCallback(() => {
    if (holding) place();
    else grab();
  }, [holding, place, grab]);

  // Spatiebalk = "de handeling" (set pakken / steen plaatsen): geeft een ritme.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tap]);

  const demand = g.demandRevealed && g.demandColor ? g.demandColor : null;

  return (
    <div className="station player-station">
      <div className="station-queue">
        <span className="queue-count">{queue.length}</span>
        <Pile colors={queue.map((u) => u.color)} />
      </div>

      <div className="build-body">
        <div className="build-head">
          <div className="station-short">Bouw</div>
          <div className="demand-chip">
            Klant wil:&nbsp;
            {demand ? (
              <>
                <span className="swatch" style={{ background: COLOR_HEX[demand] }} />
                {COLOR_LABEL[demand]}
              </>
            ) : (
              <strong>?</strong>
            )}
          </div>
        </div>

        <button className="build-zone" onClick={tap}>
          {holding ? (
            <>
              <div className="house-slots">
                {Array.from({ length: g.studsPerHouse }).map((_, i) =>
                  i < g.placedBricks ? (
                    <Brick key={i} color={holding.color} size={30} />
                  ) : (
                    <span key={i} className="slot-empty" />
                  )
                )}
              </div>
              <div className="build-hint">klik of spatie — plaats steen</div>
            </>
          ) : queue.length > 0 ? (
            <>
              <div className="grab-icon">＋</div>
              <div className="build-hint big">Pak een set</div>
            </>
          ) : (
            <div className="waiting">
              <div className="waiting-title">Wachten op materiaal…</div>
              <div className="build-hint">upstream vult bij (WIP-limiet) — de lijn stroomt nog</div>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
