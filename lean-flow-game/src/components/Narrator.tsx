import { useGame } from '../game/store';
import { narrate } from '../game/narrator';

export function Narrator() {
  const g = useGame((s) => s.g);
  const line = narrate(g);
  if (!line) return null;

  return (
    <div className="narrator">
      <div key={line.id} className={`narrator-bubble ${line.tone}`}>
        <span className="narrator-dot" />
        <span className="narrator-text">{line.text}</span>
      </div>
    </div>
  );
}
