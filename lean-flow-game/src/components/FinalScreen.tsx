import { useGame } from '../game/store';
import { euro, secs } from '../game/colors';

export function FinalScreen() {
  const g = useGame((s) => s.g);
  const restart = useGame((s) => s.restart);
  const [r1, r2] = g.roundResults;

  const rows: { label: string; a: string; b: string }[] = [
    { label: 'Winst', a: euro(r1.profit), b: euro(r2.profit) },
    { label: 'Gebouwd', a: `${r1.housesBuilt}`, b: `${r2.housesBuilt}` },
    { label: 'Verkocht', a: `${r1.housesSold}`, b: `${r2.housesSold}` },
    { label: 'Onverkocht (verspild)', a: `${r1.housesUnsold}`, b: `${r2.housesUnsold}` },
    { label: 'Piek-WIP', a: `${r1.peakWip}`, b: `${r2.peakWip}` },
    { label: 'Eerste huis na', a: secs(r1.firstHouseMs), b: secs(r2.firstHouseMs) },
  ];

  return (
    <div className="screen center">
      <div className="card-glass final">
        <div className="eyebrow">De uitslag</div>
        <h2 className="intro-title">
          Van verlies naar winst<span className="accent">.</span>
        </h2>

        <table className="final-table">
          <thead>
            <tr>
              <th></th>
              <th>
                Ronde 1<br />
                <span className="mode-tag push">PUSH</span>
              </th>
              <th>
                Ronde 2<br />
                <span className="mode-tag pull">PULL</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="row-label">{r.label}</td>
                <td>{r.a}</td>
                <td className="row-b">{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bridge">
          <p>
            Zelfde mensen. Zelfde stenen. Alleen andere spelregels. Dat is lean: niet harder werken,
            maar het werk láten stromen op vraag van de klant.
          </p>
          <p className="bridge-q">
            Neem het mee naar je eigen werk: <strong>Waar bouw jij vandaag op voorraad? Waar
            stapelt het werk zich op? Wie is jouw bottleneck?</strong>
          </p>
        </div>

        <button className="btn-primary" onClick={restart}>
          Speel opnieuw
        </button>
        <div className="footnote">
          Volgende stappen: one-piece-flow & kaizen-ronde · andere stoelen kiezen · multiplayer
        </div>
      </div>
    </div>
  );
}
