import { createTranslator } from '../lib/i18n'
import { useSettingsStore } from '../stores/settingsStore'

export function useTranslation() {
  const lang = useSettingsStore(s => s.language) ?? 'vi'
  return { t: createTranslator(lang) }
}
