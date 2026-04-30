import { useSettingsStore } from '../../stores/settingsStore'

export function LanguageSection() {
  const meaningLanguage = useSettingsStore(s => s.meaningLanguage)

  return (
    <div className="card bg-base-200 border border-base-content/10 p-4">
      <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
        NGÔN NGỮ NGHĨA
      </h2>
      <div className="flex gap-4">
        {(['vi', 'en'] as const).map(lang => (
          <label key={lang} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              className="radio radio-primary"
              name="language"
              value={lang}
              checked={meaningLanguage === lang}
              onChange={() => useSettingsStore.setState({ meaningLanguage: lang })}
            />
            <span className="font-[var(--br-mono-font)] text-sm uppercase">
              {lang === 'vi' ? 'Tiếng Việt' : 'English'}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
