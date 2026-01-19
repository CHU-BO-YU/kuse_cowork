import { createSignal, createMemo, createRoot } from "solid-js";
import en from "../locales/en.json";
import zhTW from "../locales/zh-TW.json";

// Define supported locales
export type Locale = "en" | "zh-TW";

export const SUPPORTED_LOCALES: Record<Locale, string> = {
    "en": "English",
    "zh-TW": "繁體中文"
};

// Define translation dictionary type
type Dictionary = typeof en;

// Translation resources
const resources: Record<Locale, Dictionary> = {
    "en": en,
    "zh-TW": zhTW
};

// Key type for type safety (flattened keys could be implemented for deeper nested objects if needed)
// For simplicity, we'll assume we access keys like 'agent.welcome'
// This is a simple implementation. For production, more robust key path typing is recommended.

function createI18n() {
    // Try to load saved locale from localStorage or detect from browser
    const savedLocale = localStorage.getItem("kuse-cowork-locale") as Locale;
    const browserLocale = navigator.language === "zh-TW" ? "zh-TW" : "en";
    const initialLocale: Locale = savedLocale || (Object.keys(resources).includes(browserLocale) ? browserLocale : "en");

    const [locale, setLocaleSignal] = createSignal<Locale>(initialLocale);

    const setLocale = (newLocale: Locale) => {
        setLocaleSignal(newLocale);
        localStorage.setItem("kuse-cowork-locale", newLocale);
    };

    // Get current dictionary
    const dict = createMemo(() => resources[locale()]);

    /**
     * Translate function
     * Usage: t("agent.welcome")
     */
    const t = (key: string): string => {
        const keys = key.split(".");
        let value: any = dict();

        for (const k of keys) {
            if (value === undefined || value === null) break;
            value = value[k as keyof typeof value];
        }

        if (value === undefined) {
            console.warn(`Missing translation for key: ${key} in locale: ${locale()}`);
            return key;
        }

        return value as string;
    };

    return { locale, setLocale, t };
}

// Global singleton instance
export const i18n = createRoot(createI18n);

// Hook for convenient usage
export function useI18n() {
    return i18n;
}
