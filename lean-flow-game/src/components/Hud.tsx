import { useGame } from '../game/store';
import { euro } from '../game/colors';
import { ROUNDS } from '../game/config';

export function Hud() {
  const g = useGame((s) => s.g);
  const cfg = ROUNDS[g.roundIndex];

  const remainingMs = Math.max(0, g.roundDurationMs - g.elapsedMs);
  const remaining = Math.ceil(remainingMs / 1000);
  const progress = g.elapsedMs / g.roundDurationMs;

  const wipNow =
    g.stations[1].buffer.length +
    g.stations[2].buffer.length +
    g.stations[3].buffer.length +
    (g.holding ? 1 : 0);

  const m = g.metrics;
  const hidden = g.mode === 'push' && !g.demandRevealed; // verkoop/winst pas aan het einde
  const liveCost = m.bricksConsumed; // $1 per steen, telt live mee
  const liveProfit = m.revenue - liveCost;

  return (
    <div className="hud">
      <div className="hud-left">
        <div className="round-badge">
          <span className="eyebrow">{cfg.title}</span>
          <span className={`mode-tag ${g.mode}`}>{g.mode === 'push' ? 'PUSH' : 'PULL'}</span>
        </div>
        <div className="timer">
          <span className="timer-num">{remaining}</span>
          <span className="timer-unit">s</span>
        </div>
        <div className="timer-bar">
          <div className="timer-fill" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      </div>

      <div className="hud-stats">
        <Stat label="Gebouwd" value={m.housesBuilt} />
        <Stat label="Verkocht" value={hidden ? '?' : m.housesSold} />
        <Stat label="WIP nu" value={wipNow} warn={wipNow >= 6} />
        <Stat label="Stenen gekocht" value={euro(-liveCost)} bad={liveCost > 0} />
        <Stat label="Winst" value={hidden ? '?' : euro(liveProfit)} good={!hidden && liveProfit >= 0} bad={!hidden && liveProfit < 0} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
  good,
  bad,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
  good?: boolean;
  bad?: boolean;
}) {
  const cls = ['stat', warn && 'warn', good && 'good', bad && 'bad'].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
