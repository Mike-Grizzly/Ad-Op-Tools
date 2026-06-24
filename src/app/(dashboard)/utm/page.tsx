import { getUtmTemplates, getUtmHistory } from '@/features/utm/queries'
import UtmGeneratorForm from './utm-generator-form'
import UtmHistory from './utm-history'

export default async function UtmPage() {
  const [templates, history] = await Promise.all([
    getUtmTemplates(),
    getUtmHistory(),
  ])

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">UTM Generator</h1>
        <p className="mt-1 text-sm text-gray-500">Build and save UTM parameter sets for your campaigns.</p>
      </div>
      <UtmGeneratorForm templates={templates} />
      <UtmHistory history={history} />
    </div>
  )
}
