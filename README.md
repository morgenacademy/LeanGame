# Lean Game — FLOW

Een digitale lean-simulatie van Morgen Academy. Speel je door de klassieke
LEGO-flowgame heen: je bent de bouwer, twee rondes lang, met dezelfde mensen en
stenen — alleen de spelregels veranderen. Eerst de chaos (push), dan de rust
(pull). Je krijgt geen theorie vooraf; je *ervaart* wat lean betekent en benoemt
de principes pas zelf in de debrief.

## Wat zit hierin

| Pad | Inhoud |
|-----|--------|
| `lean-flow-game/` | De web-app (React + TypeScript + Vite). |
| `compass_artifact_*.md` | Het achtergrondrapport: de essentie van de LEGO Lean-game — waarom het werkt en wat deelnemers moeten ervaren. |

## De app draaien

```bash
cd lean-flow-game
npm install
npm run dev
```

Open daarna de URL die Vite toont (standaard http://localhost:5173).

Productie-build:

```bash
npm run build      # output in dist/
npm run preview
```

## Wat de game leert (zonder het op te leggen)

- **Flow > batch, pull > push** — voel het verschil tussen de twee rondes.
- **Overproductie** — bouwen op voorraad zonder klantvraag kost geld.
- **WIP** — werk dat tussen stations ligt is vastgelegd geld.
- **Flow- vs resource-efficiëntie** — stilstaan mag, als het werk maar stroomt.
- **Principes boven praktijken** — niet harder werken, maar het systeem anders inrichten.

## Status

Fase 1 (MVP): solo, ronde 1 (push) + ronde 2 (pull), Socratische debrief, eindvergelijking.

Volgende stappen: kies-je-stoel (andere rollen speelbaar), one-piece-flow- en
kaizen-ronde, cumulative flow diagram, en — als stap 2 — een multiplayer-versie
die de sociale dynamiek terugbrengt.
