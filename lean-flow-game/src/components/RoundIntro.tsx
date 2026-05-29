import { useGame } from '../game/store';
import { ROUNDS } from '../game/config';

export function RoundIntro() {
  const g = useGame((s) => s.g);
  const beginRound = useGame((s) => s.beginRound);
  const cfg = ROUNDS[g.roundIndex];

  return (
    <div className="screen center">
      <div className="card-glass intro-card">
        <div className="eyebrow">{cfg.title}</div>
        <h2 className="intro-title">{cfg.subtitle}</h2>
        <ul className="intro-list">
          {cfg.intro.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <div className="controls-hint">
          Bedienen: <kbd>sleep</kbd> de juiste kleur uit de bak omhoog naar de bouwtekening.
        </div>
        <button className="btn-primary" onClick={beginRound}>
          Start {cfg.title.toLowerCase()} →
        </button>
      </div>
    </div>
  );
}
