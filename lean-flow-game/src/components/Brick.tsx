import { COLOR_HEX } from '../game/colors';
import type { Color } from '../game/types';

/** Eén LEGO-achtige steen. color=null toont grijs (onbewerkte WIP). */
export function Brick({ color, size = 20 }: { color: Color | null; size?: number }) {
  const hex = color ? COLOR_HEX[color] : '#6e5f86';
  return (
    <span className="brick" style={{ background: hex, width: size, height: size * 0.6 }}>
      <span className="stud" />
      <span className="stud" />
    </span>
  );
}

/** Een stapel stenen met een telling; toont maximaal `max` stenen, daarna +N. */
export function Pile({ colors, max = 10 }: { colors: (Color | null)[]; max?: number }) {
  const shown = colors.slice(0, max);
  const extra = colors.length - shown.length;
  return (
    <div className="pile" aria-label={`${colors.length} in wachtrij`}>
      {shown.map((c, i) => (
        <Brick key={i} color={c} size={18} />
      ))}
      {extra > 0 && <span className="pile-extra">+{extra}</span>}
      {colors.length === 0 && <span className="pile-empty">leeg</span>}
    </div>
  );
}
