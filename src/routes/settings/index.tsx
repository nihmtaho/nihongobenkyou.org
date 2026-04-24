import { createFileRoute } from '@tanstack/react-router'

import { useSettingsStore } from '../../stores/settingsStore'

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const language = useSettingsStore(s => s.language)

  function handleLanguageChange(value: 'vi' | 'en') {
    useSettingsStore.setState({ language: value })
  }

  return (
    <div className="p-4">
      <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight mb-6">
        SETTINGS
      </h1>

      <div className="flex flex-col gap-6">
        <div className="card bg-base-200 border border-base-content/10 p-4">
          <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
            MEANING LANGUAGE
          </h2>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                className="radio radio-primary"
                name="language"
                value="vi"
                checked={language === 'vi'}
                onChange={() => handleLanguageChange('vi')}
              />
              <span className="font-[var(--br-mono-font)] text-sm uppercase">Tiếng Việt</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                className="radio radio-primary"
                name="language"
                value="en"
                checked={language === 'en'}
                onChange={() => handleLanguageChange('en')}
              />
              <span className="font-[var(--br-mono-font)] text-sm uppercase">English</span>
            </label>
          </div>
        </div>

        <div className="card bg-base-200 border border-base-content/10 p-4">
          <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
            DARK MODE
          </h2>
          <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
            <input type="checkbox" className="toggle toggle-primary" disabled />
            <span className="font-[var(--br-mono-font)] text-sm uppercase">
              Dark Mode — Coming Soon
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
