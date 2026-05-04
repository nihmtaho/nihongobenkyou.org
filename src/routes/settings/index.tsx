import { createFileRoute } from '@tanstack/react-router'
import {
  AccountSection,
  ActiveDeckBackupSection,
  BackupSection,
  DangerZoneSection,
  DarkModeSection,
  FontSizeSection,
  LanguageSection,
  ProfileSection,
  SyncSection,
} from '../../components/settings'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const { userId } = useAuthStore()
  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-6">
      <h1 className="text-4xl font-bold uppercase font-[var(--br-heading-font)] tracking-tight">
        CÀI ĐẶT
      </h1>
      <ProfileSection />
      <LanguageSection />
      <FontSizeSection />
      <DarkModeSection />
      <SyncSection />
      <BackupSection />
      <ActiveDeckBackupSection userId={userId} />
      <DangerZoneSection />
      <AccountSection />
      <div className="bg-card border border-border/10 p-4">
        <h2 className="text-[11px] font-bold uppercase font-[var(--br-mono-font)] mb-3 text-muted-foreground">
          DATA CREDITS
        </h2>
        <div className="flex flex-col gap-2 text-xs font-[var(--br-mono-font)] text-muted-foreground">
          <p>
            Kanji stroke data:
            {' '}
            <strong>KanjiVG</strong>
            {' '}
            — Ulrich Apel (CC BY-SA 3.0)
          </p>
          <p>
            Kanji dictionary:
            {' '}
            <strong>KANJIDIC2</strong>
            {' '}
            — The Electronic Dictionary Research and Development Group (CC BY-SA 3.0)
          </p>
          <p>
            Vocabulary source:
            {' '}
            <strong>Minna no Nihongo</strong>
            {' '}
            — 3A Corporation
          </p>
        </div>
      </div>
    </div>
  )
}
