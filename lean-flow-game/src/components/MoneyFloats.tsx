import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { CoinSvg } from './icons';

interface FloatItem {
  id: number;
  text: string;
  kind: 'cost' | 'gain';
  x: number;
  y: number;
}

let nextId = 0;

/**
 * Zwevende geld-feedback: maakt zichtbaar wát de winst omlaag/omhoog duwt.
 * −$ stijgt op uit Materiaal bij elke ingekochte set; +$ uit de Markt bij verkoop.
 */
export function MoneyFloats() {
  const cost = useGame((s) => s.g.metrics.bricksConsumed);
  const revenue = useGame((s) => s.g.metrics.revenue);
  const phase = useGame((s) => s.g.phase);

  const [floats, setFloats] = useState<FloatItem[]>([]);
  const prevCost = useRef(cost);
  const prevRev = useRef(revenue);

  const spawn = (text: string, kind: FloatItem['kind'], selector: string) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2 + (Math.random() * 28 - 14);
    const y = r.top + 24;
    const id = ++nextId;
    setFloats((f) => [...f, { id, text, kind, x, y }]);
    setTimeout(() => setFloats((f) => f.filter((z) => z.id !== id)), 1100);
  };

  useEffect(() => {
    if (phase !== 'playing') {
      prevCost.current = cost;
      return;
    }
    const d = cost - prevCost.current;
    prevCost.current = cost;
    if (d > 0) spawn(`−$${d}`, 'cost', '.line .station:first-child');
  }, [cost, phase]);

  useEffect(() => {
    if (phase !== 'playing') {
      prevRev.current = revenue;
      return;
    }
    const d = revenue - prevRev.current;
    prevRev.current = revenue;
    if (d > 0) spawn(`+$${d}`, 'gain', '.market');
  }, [revenue, phase]);

  return (
    <div className="float-layer">
      {floats.map((f) => (
        <span key={f.id} className={`money-float ${f.kind}`} style={{ left: f.x, top: f.y }}>
          <CoinSvg width={15} height={15} style={{ display: 'inline-block' }} />
          {f.text}
        </span>
      ))}
    </div>
  );
}
