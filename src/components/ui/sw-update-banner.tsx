import { useTranslation } from '../../hooks/useTranslation'

interface Props { onUpdate: () => void }

export function SWUpdateBanner({ onUpdate }: Props) {
  const { t } = useTranslation()
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-foreground text-background px-4 py-3 font-[var(--br-mono-font)] text-sm border border-border shadow-lg">
      <span className="uppercase tracking-wide text-xs">{t('update.newVersion')}</span>
      <button type="button" onClick={onUpdate} className="uppercase text-xs font-bold underline hover:no-underline">
        {t('update.reload')}
      </button>
    </div>
  )
}
