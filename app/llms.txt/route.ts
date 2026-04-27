import { headers } from 'next/headers'

import { sanityFetch } from '@/sanity/lib/live'
import { llmsTxtIndexQuery, settingsQuery } from '@/sanity/lib/queries'
import { toPlainText } from 'next-sanity'

/**
 * /llms.txt — runtime context for AI agents.
 *
 * Follows the proposed spec at https://llmstxt.org/. Distinct from
 * robots.txt: this isn't allow/disallow, it's a curated, plain-text
 * map of the site so AI agents can cite us accurately when answering
 * user questions in real time.
 */
export async function GET() {
  const [{ data: settings }, { data: index }] = await Promise.all([
    sanityFetch({ query: settingsQuery, stega: false }),
    sanityFetch({ query: llmsTxtIndexQuery, stega: false }),
  ])

  const headersList = await headers()
  const host = headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') ?? 'https'
  const baseUrl = host ? `${proto}://${host}` : ''

  const title = settings?.title || 'Bert Webbink'
  const summary =
    settings?.aiSummary?.trim() ||
    (settings?.description ? toPlainText(settings.description) : '') ||
    'Field notes from one organist’s visits to old organs.'

  const lines: string[] = []
  lines.push(`# ${title}`)
  lines.push('')
  lines.push(`> ${summary}`)
  lines.push('')

  lines.push('## Pages')
  lines.push(`- [Journal (home)](${baseUrl}/): Index of journal entries.`)
  lines.push(`- [Organs](${baseUrl}/organs): Index of organ visits.`)
  lines.push(`- [Scores](${baseUrl}/scores): Working editions of organ scores.`)
  lines.push(`- [About](${baseUrl}/about): About the author.`)
  lines.push(`- [Elsewhere](${baseUrl}/elsewhere): Curated outbound links.`)
  lines.push('')

  const organs = index?.organs ?? []
  if (organs.length > 0) {
    lines.push('## Field notes — organ visits')
    for (const o of organs) {
      const desc = o.excerpt?.trim()
      lines.push(
        `- [${o.title}](${baseUrl}/organs/${o.slug})${desc ? `: ${desc}` : ''}`,
      )
    }
    lines.push('')
  }

  const journal = index?.journal ?? []
  if (journal.length > 0) {
    lines.push('## Journal entries')
    for (const j of journal) {
      const desc = j.excerpt?.trim()
      lines.push(
        `- [${j.title}](${baseUrl}/journal/${j.slug})${desc ? `: ${desc}` : ''}`,
      )
    }
    lines.push('')
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
