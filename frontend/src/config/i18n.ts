// ============================================================
// NEXUS-AID — i18n Configuration (i18next)
// Supports French (default), Arabic, English
// ============================================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import en from './locales/en.json';

// Silent logger — suppresses i18next v25 promotional Locize banner
const noop = () => { };

i18n
    .use({ type: 'logger', log: noop, warn: noop, error: console.error } as Parameters<typeof i18n.use>[0])
    .use(initReactI18next)
    .init({
        resources: {
            fr: { translation: fr },
            ar: { translation: ar },
            en: { translation: en },
        },
        lng: 'fr',
        fallbackLng: 'fr',
        debug: false,
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
