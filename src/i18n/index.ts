import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enUS from '@/src/i18n/resources/en-US';
import zhCN from '@/src/i18n/resources/zh-CN';

export const DEFAULT_LANGUAGE = 'zh-CN';

const supportedLanguages = new Set(['zh-CN', 'en-US']);

export const normalizeLanguage = (languageTag?: string): string => {
  if (!languageTag) return DEFAULT_LANGUAGE;
  if (supportedLanguages.has(languageTag)) return languageTag;
  if (languageTag.startsWith('zh')) return 'zh-CN';
  if (languageTag.startsWith('en')) return 'en-US';
  return DEFAULT_LANGUAGE;
};

const deviceLanguage = normalizeLanguage(getLocales()[0]?.languageTag);

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: deviceLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    compatibilityJSON: 'v4',
    resources: {
      'zh-CN': { translation: zhCN },
      'en-US': { translation: enUS },
    },
    interpolation: { escapeValue: false },
  });
}

export default i18n;
