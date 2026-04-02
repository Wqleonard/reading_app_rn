import { create } from 'zustand';

import i18n, { DEFAULT_LANGUAGE, normalizeLanguage } from '@/src/i18n';
import { kv } from '@/src/storage/kv/kv';

const LANGUAGE_KEY = 'app.language';

type AppState = {
  language: string;
  bootstrapped: boolean;
  bootstrap: () => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
};

export const useAppStore = create<AppState>((set) => ({
  language: i18n.language || DEFAULT_LANGUAGE,
  bootstrapped: false,

  bootstrap: async () => {
    const storedLanguage = await kv.getString(LANGUAGE_KEY);
    const nextLanguage = normalizeLanguage(storedLanguage ?? i18n.language);
    if (i18n.language !== nextLanguage) {
      await i18n.changeLanguage(nextLanguage);
    }
    set({ language: nextLanguage, bootstrapped: true });
  },

  setLanguage: async (language: string) => {
    const normalized = normalizeLanguage(language);
    await i18n.changeLanguage(normalized);
    await kv.setString(LANGUAGE_KEY, normalized);
    set({ language: normalized });
  },
}));
