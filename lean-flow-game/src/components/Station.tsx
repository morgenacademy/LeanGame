import { Pile } from './Brick';
import type { Color } from '../game/types';

interface StationProps {
  name: string;
  short: string;
  /** Wachtrij vóór dit station (de zichtbare WIP). */
  queue: (Color | null)[];
  /** Verwerkt het station nu, of staat het stil? */
  blocked: boolean;
  /** AI of speler. */
  ai: boolean;
}

export function Station({ name, short, queue, blocked, ai }: StationProps) {
  return (
    <div className="station">
      <div className="station-queue">
        <span className="queue-count">{queue.length}</span>
        <Pile colors={queue} />
      </div>
      <div className={`station-body ${blocked ? 'idle' : 'busy'}`}>
        <div className="station-short">{short}</div>
        <div className="station-name">{name}</div>
        <div className="station-status">
          <span className="dot" />
          {ai ? (blocked ? 'wacht' : 'bezig') : 'jij'}
        </div>
      </div>
    </div>
  );
}
