type PlaceholderProps = {
  /**
   * Stable identifier (typically the doc slug). Hashed deterministically to
   * pick one of the four tones, so an organ keeps the same placeholder colour
   * across renders without the editor having to choose one.
   */
  seed?: string
  label?: string
}

const TONE_KEYS = ['warm', 'cool', 'sage', 'stone'] as const
type ToneKey = (typeof TONE_KEYS)[number]

const TONES: Record<ToneKey, [string, string]> = {
  warm: ['oklch(0.85 0.018 72)', 'oklch(0.78 0.022 68)'],
  cool: ['oklch(0.85 0.014 220)', 'oklch(0.78 0.018 220)'],
  sage: ['oklch(0.84 0.018 130)', 'oklch(0.77 0.022 130)'],
  stone: ['oklch(0.86 0.008 80)', 'oklch(0.78 0.012 80)'],
}

// FNV-1a — small, deterministic, no deps. Fine for a 4-bucket pick.
function hashSeed(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

function pickTone(seed: string | undefined): ToneKey {
  if (!seed) return 'warm'
  return TONE_KEYS[hashSeed(seed) % TONE_KEYS.length]
}

export function Placeholder({ seed, label = 'organ photograph' }: PlaceholderProps) {
  const [a, b] = TONES[pickTone(seed)]
  return (
    <div
      className="placeholder-stripe"
      style={
        {
          '--stripe-a': a,
          '--stripe-b': b,
        } as React.CSSProperties
      }
    >
      <span className="label font-mono">[ {label} ]</span>
    </div>
  )
}
