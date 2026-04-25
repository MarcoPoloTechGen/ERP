import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANG, type Lang, type TranslationShape } from "@/lib/i18n/types";
import { translations } from "@/lib/i18n/translations";

export { DEFAULT_LANG };
export type { Lang, TranslationShape };

export function getStoredLang(): Lang {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem("btp-lang") : null;
  return stored === "en" || stored === "ku" ? stored : DEFAULT_LANG;
}

export function getTranslationsForLang(lang: Lang) {
  return translations[lang];
}

const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TranslationShape;
}>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: translations[DEFAULT_LANG],
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => getStoredLang());

  useEffect(() => {
    document.documentElement.lang = lang === "ku" ? "ckb" : "en";
    document.documentElement.dir = translations[lang].dir;
    window.localStorage.setItem("btp-lang", lang);
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang: setLangState,
      t: translations[lang],
    }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
