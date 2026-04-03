import { create } from 'zustand';

type RecommendMode = 'main' | 'decision' | 'branchResult';

type RecommendState = {
  mode: RecommendMode;
  playing: boolean;
  progress: number;
  chosenChoiceText: string | null;
  tick: () => void;
  togglePlay: () => void;
  chooseBranch: (choiceText: string) => void;
  restart: () => void;
};

const STEP = 5;
const DECISION_THRESHOLD = 90;

export const useRecommendStore = create<RecommendState>((set, get) => ({
  mode: 'main',
  playing: true,
  progress: 0,
  chosenChoiceText: null,
  tick: () => {
    const state = get();
    if (!state.playing || state.mode === 'branchResult') return;

    const nextProgress = Math.min(state.progress + STEP, 100);
    if (nextProgress >= DECISION_THRESHOLD && state.mode === 'main') {
      set({ progress: nextProgress, mode: 'decision', playing: false });
      return;
    }
    set({ progress: nextProgress });
  },
  togglePlay: () => set((state) => ({ playing: !state.playing })),
  chooseBranch: (choiceText) =>
    set({
      mode: 'branchResult',
      chosenChoiceText: choiceText,
      playing: false,
      progress: 100,
    }),
  restart: () =>
    set({
      mode: 'main',
      playing: true,
      progress: 0,
      chosenChoiceText: null,
    }),
}));
