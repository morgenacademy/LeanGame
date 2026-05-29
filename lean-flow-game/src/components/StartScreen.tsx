import { useGame } from '../game/store';

export function StartScreen() {
  const startGame = useGame((s) => s.startGame);
  return (
    <div className="screen center">
      <div className="hero card-glass">
        <div className="eyebrow">Lean simulatie · Morgen</div>
        <h1 className="display">
          FLOW<span className="accent">.</span>
        </h1>
        <p className="lead">
          Een fabriek van LEGO-huizen. Jij bent de bouwer. Twee rondes, dezelfde mensen en stenen —
          alleen de spelregels veranderen.
        </p>
        <p className="sub">
          Je krijgt geen theorie vooraf. Je gáát het voelen: eerst de chaos, dan de rust. Wat lean
          écht betekent, ontdek je zelf.
        </p>
        <button className="btn-primary" onClick={startGame}>
          Start de simulatie →
        </button>
        <div className="footnote">≈ 5 minuten · solo · multiplayer volgt later</div>
      </div>
    </div>
  );
}
