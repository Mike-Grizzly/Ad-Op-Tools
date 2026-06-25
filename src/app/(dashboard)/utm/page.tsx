import { getUTMTemplates, getUTMHistory } from '@/features/utm/queries'
import { UTMPageClient } from '@/features/utm/components/utm-page-client'

export default async function UTMPage() {
  const [templates, history] = await Promise.all([
    getUTMTemplates(),
    getUTMHistory(),
  ])

  return <UTMPageClient initialTemplates={templates} initialHistory={history} />
}
