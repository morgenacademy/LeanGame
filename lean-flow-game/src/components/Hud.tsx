import type { ComponentType, SVGProps } from 'react';
import { useGame } from '../game/store';
import { euro } from '../game/colors';
import { ROUNDS } from '../game/config';
import { BuiltStatSvg, CostStatSvg, ProfitStatSvg, SoldStatSvg, WipStatSvg } from './icons';

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
  // Kleine rekensom eronder, zodat de getallen 'kloppen' i.p.v. magisch zijn.
  const costSum = `${Math.round(liveCost)} stenen × $1`;
  const profitSum = hidden ? '?' : `${m.housesSold}×$25 − $${Math.round(liveCost)}`;

  return (
    <div className="hud">
      <div className="hud-tile hud-round">
        <div className="hud-label">Ronde</div>
        <div className="round-pips" aria-label={cfg.title}>
          {ROUNDS.map((_, i) => (
            <span key={i} className={i <= g.roundIndex ? 'active' : ''} />
          ))}
        </div>
      </div>

      <div className="hud-tile hud-mode">
        <div className="hud-label">Modus</div>
        <div className={`mode-flow ${g.mode}`}>
          <span className="mode-dot" />
          <span className="mode-line" />
          <span className="mode-end" />
          <span className="mode-text">{g.mode === 'push' ? 'Push' : 'Pull'}</span>
        </div>
      </div>

      <div className="hud-tile hud-timer">
        <div className="timer">
          <span className="timer-icon" aria-hidden>◷</span>
          <span className="timer-num">00:{String(remaining).padStart(2, '0')}</span>
        </div>
        <div className="timer-bar">
          <div className="timer-fill" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      </div>

      <div className="hud-stats">
        <Stat label="Gebouwd" icon={BuiltStatSvg} value={m.housesBuilt} />
        <Stat label="Verkocht" icon={SoldStatSvg} value={hidden ? '?' : m.housesSold} />
        <Stat label="WIP" icon={WipStatSvg} value={wipNow} warn={wipNow >= 6} />
        <Stat label="Kosten" icon={CostStatSvg} value={euro(-liveCost)} sub={costSum} bad={liveCost > 0} />
        <Stat
          label="Winst"
          icon={ProfitStatSvg}
          value={hidden ? '?' : euro(liveProfit)}
          sub={profitSum}
          good={!hidden && liveProfit >= 0}
          bad={!hidden && liveProfit < 0}
        />
      </div>

      <div className="hud-menu" aria-hidden>☰</div>
    </div>
  );
}

function Stat({
  label,
  icon,
  value,
  sub,
  warn,
  good,
  bad,
}: {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  value: string | number;
  sub?: string;
  warn?: boolean;
  good?: boolean;
  bad?: boolean;
}) {
  const cls = ['stat', warn && 'warn', good && 'good', bad && 'bad'].filter(Boolean).join(' ');
  const Icon = icon;
  return (
    <div className={cls}>
      <div className="stat-label">{label}</div>
      <div className="stat-main">
        <Icon className="stat-icon" aria-hidden focusable="false" />
        <span className="stat-value">{value}</span>
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
