import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/srs/')({
  component: SrsPage,
})

function SrsPage() {
  return <div>SRS</div>
}
