import { useEffect, useState } from 'react';
import { useGame } from '../game/store';

interface Step {
  /** Eén element, of meerdere (dan omsluit de spotlight ze samen). */
  target: () => Element | Element[] | null;
  title: string;
  text: string;
}

const q = (s: string) => document.querySelector(s);
const qa = (s: string) => document.querySelectorAll(s);

// Korte oriëntatie voor latere rondes (board staat al uitgelegd in ronde 1).
const LATER_STEPS: Step[] = [
  {
    target: () => q('.demand-bubble') ?? q('.market'),
    title: 'Nieuwe ronde, kijk even rond',
    text: 'De klant zegt nu vooraf wat hij wil: zie de vraag bij de markt. Maak alléén dat. Soms sta je even stil, dat mag. Klaar?',
  },
];

const ROUND1_STEPS: Step[] = [
  {
    target: () => q('.line'),
    title: 'De fabriek',
    text: 'Vier werkplekken op een rij. Werk stroomt van links naar rechts, van losse stenen tot een afgebouwd huis.',
  },
  {
    target: () => [...qa('.station')].slice(0, 3),
    title: 'De werkplekken',
    text: 'Het begint links: sorteren op kleur → op maat → een set samenstellen. Het set-station wacht tot er vier onderdelen liggen.',
  },
  {
    target: () => q('.player-station'),
    title: 'Dit ben JIJ, de bouwer',
    text: 'Jij bent de laatste werkplek. Je bouwt het huis: sleep onderdelen uit jouw set naar de bouwvakken.',
  },
  {
    target: () => q('.market'),
    title: 'De klant (buiten de fabriek)',
    text: 'Hier koopt de klant. In deze ronde hoor je pas aan het eind wélke kleur hij wil. Je bouwt dus blind, dat is expres.',
  },
  {
    target: () => q('.hud-stats'),
    title: 'Jouw doel',
    text: 'Maak zoveel mogelijk winst: lever huizen die de klant koopt. Hou de wachtrijen (WIP) en de winst in de gaten.',
  },
  {
    target: () => q('.player-station'),
    title: 'Klaar?',
    text: 'Bouw zoveel je kunt. Let op: kun je het bijbenen, en bouw je het juiste? Veel succes.',
  },
];

export function Tour() {
  const startClock = useGame((s) => s.startClock);
  const round = useGame((s) => s.g.roundIndex);
  const STEPS = round === 0 ? ROUND1_STEPS : LATER_STEPS;
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  useEffect(() => {
    const measure = () => {
      const t = step.target();
      if (Array.isArray(t)) {
        const rs = t.filter(Boolean).map((e) => e.getBoundingClientRect());
        if (rs.length === 0) return setRect(null);
        const left = Math.min(...rs.map((r) => r.left));
        const top = Math.min(...rs.map((r) => r.top));
        const right = Math.max(...rs.map((r) => r.right));
        const bottom = Math.max(...rs.map((r) => r.bottom));
        setRect(new DOMRect(left, top, right - left, bottom - top));
      } else {
        setRect(t ? t.getBoundingClientRect() : null);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step]);

  const pad = 10;
  const tipTopRaw = rect ? rect.bottom + 16 : window.innerHeight / 2;
  const tipTop = Math.min(Math.max(tipTopRaw, 96), window.innerHeight - 280);
  const tipLeft = rect
    ? Math.min(Math.max(rect.left + rect.width / 2, 230), window.innerWidth - 230)
    : window.innerWidth / 2;

  return (
    <div className="tour">
      {rect && (
        <div
          className="tour-spot"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
          }}
        />
      )}
      <div className="tour-card" style={{ top: tipTop, left: tipLeft }}>
        <div className="tour-step">
          {STEPS.length > 1 ? `Rondleiding · ${i + 1} / ${STEPS.length}` : 'Even oriënteren'}
        </div>
        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-text">{step.text}</p>
        <div className="tour-actions">
          {!last && (
            <button className="tour-skip" onClick={() => startClock()}>
              overslaan
            </button>
          )}
          <button className="btn-primary" onClick={() => (last ? startClock() : setI(i + 1))}>
            {last ? 'Start ronde →' : 'Volgende →'}
          </button>
        </div>
      </div>
    </div>
  );
}
