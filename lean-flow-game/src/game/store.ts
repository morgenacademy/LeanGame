import { create } from 'zustand';
import { makeRoundState, tick, placeBrick, seedHolding } from './engine';
import { ROUNDS, TICK_MS } from './config';
import type { Color, GameState } from './types';

interface Store {
  g: GameState;
  /** true vóór de eerste start (toont het startscherm). */
  showIntro: boolean;
  /** Walkthrough actief: board staat zichtbaar maar gepauzeerd. */
  tourActive: boolean;
  startGame: () => void;
  /** Loop de vloer op: board tonen, klok nog niet starten (ronde 1 → walkthrough). */
  enterFloor: () => void;
  /** Start de klok daadwerkelijk (na de walkthrough, of meteen vanaf ronde 2). */
  startClock: () => void;
  place: (color: Color) => void;
  proceed: () => void;
  restart: () => void;
}

let timer: ReturnType<typeof setInterval> | null = null;

function clone(g: GameState): GameState {
  return structuredClone(g);
}

export const useGame = create<Store>((set, get) => {
  function stopTimer() {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startTimer() {
    stopTimer();
    let last = performance.now();
    timer = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      set((state) => {
        const g = clone(state.g);
        tick(g, dt);
        if (g.phase !== 'playing') stopTimer();
        return { g };
      });
    }, TICK_MS);
  }

  return {
    g: makeRoundState(0),
    showIntro: true,
    tourActive: false,

    startGame() {
      stopTimer();
      const g = makeRoundState(0);
      g.phase = 'round-intro';
      set({ g, showIntro: false, tourActive: false });
    },

    enterFloor() {
      const round = get().g.roundIndex;
      set((state) => {
        const g = clone(state.g);
        g.phase = 'playing';
        g.running = false;
        if (round === 0) seedHolding(g); // bouw-UI alvast zichtbaar tijdens walkthrough
        return { g, tourActive: round === 0 };
      });
      if (round !== 0) get().startClock();
    },

    startClock() {
      set((state) => {
        const g = clone(state.g);
        g.running = true;
        return { g, tourActive: false };
      });
      startTimer();
    },

    place(color) {
      set((state) => {
        const g = clone(state.g);
        placeBrick(g, color);
        return { g };
      });
    },

    proceed() {
      stopTimer();
      const cur = get().g;
      const results = [...cur.roundResults, cur.metrics];
      const nextIdx = cur.roundIndex + 1;
      if (nextIdx >= ROUNDS.length) {
        set({ g: { ...cur, phase: 'finished', roundResults: results }, tourActive: false });
      } else {
        const g = makeRoundState(nextIdx, results);
        g.phase = 'round-intro';
        set({ g, tourActive: false });
      }
    },

    restart() {
      stopTimer();
      set({ g: makeRoundState(0), showIntro: true, tourActive: false });
    },
  };
});
