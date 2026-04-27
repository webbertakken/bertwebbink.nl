/**
 * Hardcoded launch moment for the under-construction gate.
 *
 * The middleware reads this to decide whether to show the gate, and the
 * `/under-construction` page reads it to render the countdown. When
 * `Date.now() >= LAUNCH_AT_MS` the gate auto-disables \u2014 no redeploy needed.
 *
 * Stored as an explicit `+02:00` ISO string so the value is timezone-anchored
 * and isn't accidentally interpreted as UTC.
 */
export const LAUNCH_AT_ISO = '2026-04-30T12:00:00+02:00'
export const LAUNCH_AT_MS = Date.parse(LAUNCH_AT_ISO)
