import { create } from 'zustand';
import { makeRoundState, tick, placeBrick } from './engine';
import { ROUNDS, TICK_MS } from './config';
import type { Color, GameState } from './types';

interface Store {
  g: GameState;
  /** true vóór de eerste start (toont het startscherm). */
  showIntro: boolean;
  startGame: () => void;
  beginRound: () => void;
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
    // Wall-clock dt: de simulatie loopt op echte verstreken tijd, niet op een vast
    // interval. Zo blijft de speeltijd kloppen ook als de browser het interval throttlet
    // (bv. een achtergrond-tab) of frames laat vallen.
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

    startGame() {
      stopTimer();
      const g = makeRoundState(0);
      g.phase = 'round-intro';
      set({ g, showIntro: false });
    },

    beginRound() {
      set((state) => {
        const g = clone(state.g);
        g.phase = 'playing';
        g.running = true;
        return { g };
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
        set({ g: { ...cur, phase: 'finished', roundResults: results } });
      } else {
        const g = makeRoundState(nextIdx, results);
        g.phase = 'round-intro';
        set({ g });
      }
    },

    restart() {
      stopTimer();
      set({ g: makeRoundState(0), showIntro: true });
    },
  };
});
