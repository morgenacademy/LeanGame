import type { CSSProperties } from 'react';
import { COLOR_HEX } from '../game/colors';
import type { Color } from '../game/types';

/** Eén werkblok. color=null = neutrale ruwe WIP. */
export function Brick({ color, size = 20 }: { color: Color | null; size?: number }) {
  const hex = color ? COLOR_HEX[color] : '#6e5f86';
  return (
    <span
      className="cube-brick"
      style={
        {
          '--cube-color': hex,
          '--cube-size': `${size}px`,
        } as CSSProperties
      }
    />
  );
}

export interface PileItem {
  id: number;
  color: Color | null;
}

/**
 * Een stapel stenen met telling. Items zijn gesleuteld op id, zodat alleen
 * een nieuw binnengekomen steen de pop-animatie krijgt (de stapel "groeit" zichtbaar).
 */
export function Pile({ items, max = 12 }: { items: PileItem[]; max?: number }) {
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return (
    <div className="pile" aria-label={`${items.length} in wachtrij`}>
      {shown.map((it) => (
        <span key={it.id} className="brick-wrap">
          <Brick color={it.color} size={18} />
        </span>
      ))}
      {extra > 0 && <span className="pile-extra">+{extra}</span>}
      {items.length === 0 && <span className="pile-empty">leeg</span>}
    </div>
  );
}
