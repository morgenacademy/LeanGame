import type { ReactNode } from 'react';
import { Pile, type PileItem } from './Brick';

interface StationProps {
  name: string;
  short: string;
  /** Wachtrij vóór dit station (de zichtbare WIP). */
  queue: PileItem[];
  /** Verwerkt het station nu, of staat het stil? */
  blocked: boolean;
  /** AI of speler. */
  ai: boolean;
  /** Voortgang naar de volgende handeling (0..1). undefined = geen meter. */
  progress?: number;
  /** Klein station-icoon dat toont wat hier gebeurt. */
  icon?: ReactNode;
}

export function Station({ name, short, queue, blocked, ai, progress, icon }: StationProps) {
  const cls = ['station', ai ? 'station-ai' : 'station-player', blocked && 'station-blocked']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      <div className="station-queue">
        <span className="queue-count">{queue.length}</span>
        <Pile items={queue} />
      </div>
      <div className={`station-body machine ${blocked ? 'idle' : 'busy'}`}>
        {icon && <div className="station-icon">{icon}</div>}
        <div className="station-short">{short}</div>
        <div className="station-name">{name}</div>
        {progress != null && (
          <div className="work-meter">
            <div
              className={`work-fill ${blocked ? 'stalled' : ''}`}
              style={{ width: `${Math.round((blocked ? 0 : progress) * 100)}%` }}
            />
          </div>
        )}
        <div className="station-status">
          <span className="dot" />
          {ai ? (blocked ? 'wacht' : 'bezig') : 'jij'}
        </div>
      </div>
    </div>
  );
}
