import { useLanguageStore } from '../store/useLanguageStore';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import pa from '../locales/pa.json';
import gu from '../locales/gu.json';

const translations: Record<string, any> = { en, hi, pa, gu };

export function useTranslation() {
  const { language, setLanguage } = useLanguageStore();

  const t = (key: string): string => {
    const bundle = translations[language] || en;
    const parts = key.split('.');
    let value = bundle;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return key; // Fallback to key
      }
    }

    return typeof value === 'string' ? value : key;
  };

  return { t, language, setLanguage };
}
