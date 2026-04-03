import { create } from 'zustand';

type EncounterMode = 'main' | 'singleResult' | 'tenResult';

type EncounterState = {
  mode: EncounterMode;
  singleResultId: string | null;
  tenResultIds: string[];
  drawSingle: (pool: string[]) => void;
  drawTen: (pool: string[]) => void;
  reset: () => void;
};

function randomPick(pool: string[]): string {
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

export const useEncounterStore = create<EncounterState>((set) => ({
  mode: 'main',
  singleResultId: null,
  tenResultIds: [],
  drawSingle: (pool) => {
    if (pool.length === 0) return;
    set({
      mode: 'singleResult',
      singleResultId: randomPick(pool),
      tenResultIds: [],
    });
  },
  drawTen: (pool) => {
    if (pool.length === 0) return;
    set({
      mode: 'tenResult',
      singleResultId: null,
      tenResultIds: Array.from({ length: 10 }, () => randomPick(pool)),
    });
  },
  reset: () =>
    set({
      mode: 'main',
      singleResultId: null,
      tenResultIds: [],
    }),
}));
