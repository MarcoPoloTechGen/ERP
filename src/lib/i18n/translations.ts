import { createEnglishTranslations } from "@/lib/i18n/en";
import { createSoraniTranslations } from "@/lib/i18n/ku";
import type { Lang, TranslationShape } from "@/lib/i18n/types";

export const translations: Record<Lang, TranslationShape> = {
  en: createEnglishTranslations("ltr"),
  ku: createSoraniTranslations("rtl"),
};
