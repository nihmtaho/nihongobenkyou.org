import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from '@/components/ui/responsive-dialog'

interface SrsGuideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SrsGuideDialog({ open, onOpenChange }: SrsGuideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase font-[var(--br-heading-font)] tracking-tight">
            Hướng dẫn hệ thống SRS
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 text-sm">
          <p className="text-muted-foreground leading-relaxed">
            SRS (Spaced Repetition System) giúp bạn ôn tập đúng lúc — trước khi quên. Mỗi thẻ được lên lịch tự động dựa trên cách bạn đánh giá.
          </p>

          {/* Stages */}
          <section>
            <h3 className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest text-muted-foreground mb-2">
              Các giai đoạn
            </h3>
            <div className="flex flex-col gap-1.5">
              <StageRow color="text-warning" label="Đang học" desc="Thẻ mới, đi qua các bước học ngắn (1 phút → 10 phút → 1 ngày)" />
              <StageRow color="text-info" label="Ôn tập" desc="Thẻ đã học xong, ôn theo khoảng cách tăng dần (ngày/tuần/tháng)" />
              <StageRow color="text-destructive" label="Học lại" desc="Thẻ ôn bị quên, quay lại bước học ngắn trước khi ôn lại" />
              <StageRow color="text-success" label="Đã thuộc" desc="Thẻ có khoảng cách ôn ≥ 21 ngày" />
            </div>
          </section>

          {/* Ratings — Learning */}
          <section>
            <h3 className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest text-muted-foreground mb-2">
              Đánh giá — Thẻ mới (Đang học)
            </h3>
            <RatingTable rows={[
              { rating: 'Again', variant: 'destructive', time: '1 phút', desc: 'Quên. Quay về bước đầu.' },
              { rating: 'Hard', variant: 'warning', time: '1 phút', desc: 'Còn khó. Giữ nguyên bước.' },
              { rating: 'Good', variant: 'success', time: '10 phút', desc: 'Nhớ được. Tiến lên bước tiếp.' },
              { rating: 'Easy', variant: 'info', time: '4 ngày', desc: 'Thuộc ngay. Tốt nghiệp luôn.' },
            ]}
            />
          </section>

          {/* Ratings — Review */}
          <section>
            <h3 className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest text-muted-foreground mb-2">
              Đánh giá — Thẻ ôn tập
            </h3>
            <RatingTable rows={[
              { rating: 'Again', variant: 'destructive', time: '6–10 phút', desc: 'Quên. Vào học lại, khoảng cách giảm.' },
              { rating: 'Hard', variant: 'warning', time: '×1.2', desc: 'Khó. Khoảng cách tăng nhẹ, ease giảm.' },
              { rating: 'Good', variant: 'success', time: '×ease', desc: 'Nhớ tốt. Khoảng cách nhân với hệ số ease.' },
              { rating: 'Easy', variant: 'info', time: '×ease×1.3', desc: 'Quá dễ. Khoảng cách tăng mạnh, ease tăng.' },
            ]}
            />
            <p className="text-[10px] text-muted-foreground mt-2 font-[var(--br-mono-font)]">
              Ease mặc định: 2.5 — min: 1.3 — khoảng cách tối đa: 180 ngày
            </p>
          </section>

          {/* Keyboard shortcuts */}
          <section>
            <h3 className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest text-muted-foreground mb-2">
              Phím tắt khi học
            </h3>
            <div className="grid grid-cols-2 gap-1">
              {[
                ['⌘/Ctrl + 1', 'Again'],
                ['⌘/Ctrl + 2', 'Hard'],
                ['⌘/Ctrl + 3', 'Good'],
                ['⌘/Ctrl + 4', 'Easy'],
                ['Space / Enter', 'Lật thẻ / Tiếp tục'],
              ].map(([key, action]) => (
                <div key={key} className="flex items-center gap-2 py-1">
                  <kbd className="px-1.5 py-0.5 text-[9px] font-[var(--br-mono-font)] bg-muted border border-border rounded whitespace-nowrap">
                    {key}
                  </kbd>
                  <span className="text-[11px] text-muted-foreground">{action}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Modes */}
          <section>
            <h3 className="text-[10px] font-[var(--br-mono-font)] uppercase tracking-widest text-muted-foreground mb-2">
              Các mode học
            </h3>
            <div className="flex flex-col gap-1">
              {[
                ['Flashcard', 'Xem từ → lật → tự đánh giá'],
                ['Gõ từ', 'Nhập chữ kana/kanji → kiểm tra → đánh giá'],
                ['Trắc nghiệm', 'Chọn đáp án đúng → đánh giá'],
              ].map(([mode, desc]) => (
                <div key={mode} className="flex gap-2 py-1 border-b border-border/10 last:border-0">
                  <span className="text-[11px] font-bold w-24 shrink-0">{mode}</span>
                  <span className="text-[11px] text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StageRow({ color, label, desc }: { color: string, label: string, desc: string }) {
  return (
    <div className="flex gap-2 items-start py-1 border-b border-border/10 last:border-0">
      <span className={`text-[11px] font-bold w-20 shrink-0 ${color}`}>{label}</span>
      <span className="text-[11px] text-muted-foreground leading-relaxed">{desc}</span>
    </div>
  )
}

type RatingVariant = 'destructive' | 'warning' | 'success' | 'info'
const VARIANT_COLOR: Record<RatingVariant, string> = {
  destructive: 'text-destructive',
  warning: 'text-warning',
  success: 'text-success',
  info: 'text-info',
}

function RatingTable({ rows }: { rows: Array<{ rating: string, variant: RatingVariant, time: string, desc: string }> }) {
  return (
    <div className="flex flex-col gap-0">
      {rows.map(({ rating, variant, time, desc }) => (
        <div key={rating} className="grid grid-cols-[64px_72px_1fr] gap-2 py-1.5 border-b border-border/10 last:border-0 items-start">
          <span className={`text-[11px] font-bold ${VARIANT_COLOR[variant]}`}>{rating}</span>
          <span className="text-[11px] font-[var(--br-mono-font)] text-foreground/70">{time}</span>
          <span className="text-[11px] text-muted-foreground leading-relaxed">{desc}</span>
        </div>
      ))}
    </div>
  )
}
