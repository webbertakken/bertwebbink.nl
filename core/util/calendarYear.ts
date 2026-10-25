/**
 * Calendar years shown in page copy ("since 2004", "© 2026"). Read in UTC so
 * every render agrees regardless of the host's time zone. Server components
 * read the clock here, once per (ISR) render, and pass the year down to client
 * components so hydration never re-reads it.
 */
export function currentYear(now: Date = new Date()): number {
  return now.getUTCFullYear()
}

/** Year of `firstDate`, or the current year while there is no first date yet. */
export function firstYearOrCurrent(
  firstDate: string | null | undefined,
  now: Date = new Date(),
): number {
  return firstDate ? new Date(firstDate).getUTCFullYear() : currentYear(now)
}
