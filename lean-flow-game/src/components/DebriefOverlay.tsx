import { useState } from 'react';
import { useGame } from '../game/store';
import { buildDebrief } from '../game/debrief';
import { ROUNDS } from '../game/config';

export function DebriefOverlay() {
  const g = useGame((s) => s.g);
  const proceed = useGame((s) => s.proceed);

  const script = buildDebrief(g);
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);

  const cur = script.steps[step];
  const isLastStep = step === script.steps.length - 1;
  const isLastRound = g.roundIndex >= ROUNDS.length - 1;
  const answered = choice !== null;

  function next() {
    if (isLastStep) {
      proceed();
    } else {
      setStep(step + 1);
      setChoice(null);
    }
  }

  return (
    <div className="overlay">
      <div className="card-glass debrief">
        <div className="debrief-head">
          <span className="eyebrow">{script.tag} · reflectie</span>
          <span className="debrief-progress">
            {step + 1} / {script.steps.length}
          </span>
        </div>

        <h2 className="debrief-q">{cur.question}</h2>
        {cur.hint && <p className="debrief-hint">{cur.hint}</p>}

        <div className="debrief-options">
          {cur.options.map((opt, i) => (
            <button
              key={i}
              className={`debrief-opt ${choice === i ? 'chosen' : ''} ${answered && choice !== i ? 'faded' : ''}`}
              disabled={answered}
              onClick={() => setChoice(i)}
            >
              {opt}
            </button>
          ))}
        </div>

        {answered && (
          <div className="reveal">
            <div className="reveal-principle">{cur.principle}</div>
            <p className="reveal-text">{cur.reveal}</p>
            <button className="btn-primary" onClick={next}>
              {isLastStep ? (isLastRound ? 'Naar de uitslag →' : 'Volgende ronde →') : 'Volgende →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
