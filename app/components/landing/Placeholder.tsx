type PlaceholderProps = {
  tone?: 'warm' | 'cool' | 'sage' | 'stone'
  label?: string
}

const TONES: Record<NonNullable<PlaceholderProps['tone']>, [string, string]> = {
  warm: ['oklch(0.85 0.018 72)', 'oklch(0.78 0.022 68)'],
  cool: ['oklch(0.85 0.014 220)', 'oklch(0.78 0.018 220)'],
  sage: ['oklch(0.84 0.018 130)', 'oklch(0.77 0.022 130)'],
  stone: ['oklch(0.86 0.008 80)', 'oklch(0.78 0.012 80)'],
}

export function Placeholder({ tone = 'warm', label = 'organ photograph' }: PlaceholderProps) {
  const [a, b] = TONES[tone] ?? TONES.warm
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
