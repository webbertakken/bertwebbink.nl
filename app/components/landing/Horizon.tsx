type HorizonProps = {
  variant?: 'fields' | 'pipes' | 'plains' | 'trees'
  showSun?: boolean
}

/**
 * Horizon — atmospheric SVG hero backdrop. Pure server component (no state).
 * Three variants: 'fields' (default, with church + windmill silhouettes),
 * 'pipes' (organ pipe horizon), 'plains' (single steeple, soft hill).
 */
export function Horizon({ variant = 'fields', showSun = true }: HorizonProps) {
  return (
    <svg
      className="block w-full h-full absolute inset-0"
      viewBox="0 0 1600 860"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">
          {/* Top stop is intentionally darker than the page bg (0.975) so
              the hero is visibly distinct from the page when it tucks
              behind the transparent nav. */}
          <stop offset="0%" stopColor="oklch(0.93 0.014 72)" />
          <stop offset="55%" stopColor="oklch(0.945 0.010 78)" />
          <stop offset="100%" stopColor="oklch(0.91 0.014 75)" />
        </linearGradient>
        <linearGradient id="g-horizon-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.94 0.014 70)" stopOpacity="0" />
          <stop offset="60%" stopColor="oklch(0.96 0.020 65)" stopOpacity="1" />
          <stop offset="100%" stopColor="oklch(0.94 0.014 70)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="g-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.84 0.014 75)" />
          <stop offset="40%" stopColor="oklch(0.90 0.012 78)" />
          <stop offset="100%" stopColor="oklch(0.975 0.005 85)" />
        </linearGradient>
        <linearGradient id="g-far-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.018 72)" />
          <stop offset="100%" stopColor="oklch(0.86 0.014 78)" />
        </linearGradient>
        <linearGradient id="g-mid-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.72 0.022 70)" />
          <stop offset="100%" stopColor="oklch(0.82 0.016 75)" />
        </linearGradient>
        <linearGradient id="g-near-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.016 75)" />
          <stop offset="40%" stopColor="oklch(0.84 0.014 76)" />
          <stop offset="80%" stopColor="oklch(0.91 0.012 78)" />
          <stop offset="100%" stopColor="oklch(0.94 0.010 80)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="g-pipe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.58 0.024 65)" />
          <stop offset="100%" stopColor="oklch(0.74 0.018 70)" />
        </linearGradient>
        <linearGradient id="g-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.97 0.006 80)" stopOpacity="0" />
          <stop offset="50%" stopColor="oklch(0.97 0.006 80)" stopOpacity="0.65" />
          <stop offset="100%" stopColor="oklch(0.97 0.006 80)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="g-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.985 0.012 75)" stopOpacity="1" />
          <stop offset="60%" stopColor="oklch(0.975 0.010 78)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="oklch(0.97 0.008 80)" stopOpacity="0" />
        </radialGradient>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.16  0 0 0 0 0.14  0 0 0 0.05 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      <rect x="0" y="0" width="1600" height="460" fill="url(#g-sky)" />
      <rect x="0" y="380" width="1600" height="120" fill="url(#g-horizon-glow)" opacity="0.9" />

      {showSun && (
        <g>
          <circle cx="1080" cy="340" r="180" fill="url(#g-sun)" opacity="0.85" />
          <circle cx="1080" cy="340" r="58" fill="oklch(0.985 0.014 80)" opacity="0.95" />
          <circle
            cx="1080"
            cy="340"
            r="58"
            fill="none"
            stroke="oklch(0.78 0.018 60)"
            strokeWidth="0.5"
            opacity="0.55"
          />
        </g>
      )}

      <g stroke="oklch(0.78 0.014 70)" strokeWidth="0.6" opacity="0.45" strokeLinecap="round">
        <line x1="160" y1="180" x2="380" y2="180" />
        <line x1="240" y1="200" x2="340" y2="200" />
        <line x1="640" y1="150" x2="900" y2="150" />
        <line x1="720" y1="170" x2="860" y2="170" />
        <line x1="1240" y1="200" x2="1480" y2="200" />
        <line x1="1300" y1="220" x2="1440" y2="220" />
      </g>

      <line
        x1="0"
        y1="430"
        x2="1600"
        y2="430"
        stroke="oklch(0.36 0.022 60)"
        strokeWidth="1.4"
        opacity="0.7"
      />
      <line
        x1="0"
        y1="431.6"
        x2="1600"
        y2="431.6"
        stroke="oklch(0.97 0.008 80)"
        strokeWidth="0.7"
        opacity="0.9"
      />
      <rect x="0" y="392" width="1600" height="80" fill="url(#g-mist)" opacity="0.7" />

      <rect x="0" y="430" width="1600" height="430" fill="url(#g-land)" />

      {variant === 'fields' && (
        <g>
          <path
            d="M0 430 C 180 420, 360 426, 540 422 S 900 432, 1100 424 S 1400 428, 1600 422 L 1600 470 L 0 470 Z"
            fill="url(#g-far-hill)"
            opacity="0.6"
          />
          {(
            [
              [200, 426, 8],
              [212, 426, 6],
              [222, 426, 9],
              [560, 422, 10],
              [572, 422, 7],
              [582, 422, 12],
              [594, 422, 8],
              [950, 425, 6],
              [962, 425, 9],
              [974, 425, 6],
              [1320, 423, 8],
              [1332, 423, 5],
            ] as const
          ).map(([x, y, h], i) => (
            <line
              key={i}
              x1={x}
              y1={y}
              x2={x}
              y2={y - h}
              stroke="oklch(0.54 0.020 60)"
              strokeWidth="0.7"
              opacity="0.6"
            />
          ))}

          {/* Distant church + windmill silhouettes used to live here at viewBox
              x=486 and x=1340 — both got cropped on narrow viewports because
              `xMidYMid slice` only shows the central ~440 viewBox units of
              width on mobile. They're now rendered as separate, viewport-edge
              anchored elements in <Hero/> so they survive at any width. */}

          <path
            d="M0 458 C 220 436, 440 472, 660 452 S 1080 476, 1300 450 S 1520 466, 1600 458 L 1600 580 L 0 580 Z"
            fill="url(#g-mid-hill)"
            opacity="0.85"
          />
          <path
            d="M0 510 C 240 492, 480 524, 740 504 S 1180 532, 1420 512 C 1500 504, 1560 510, 1600 514 L 1600 720 L 0 720 Z"
            fill="url(#g-near-hill)"
            opacity="0.85"
          />

          <g stroke="oklch(0.58 0.022 65)" strokeWidth="0.4">
            {Array.from({ length: 30 }).map((_, i) => {
              const y = 580 + i * 4
              const ramp = Math.min(1, i / 10)
              return <line key={i} x1="0" y1={y} x2="1600" y2={y - 2} opacity={0.18 * ramp} />
            })}
          </g>
        </g>
      )}

      {variant === 'pipes' && (
        <g>
          <path
            d="M0 470 C 280 456, 520 480, 800 470 S 1320 482, 1600 468 L 1600 540 L 0 540 Z"
            fill="url(#g-mid-hill)"
            opacity="0.7"
          />
          <g opacity="0.65">
            {(() => {
              const heights = [
                78, 110, 138, 170, 200, 224, 200, 170, 138, 110, 78, 64, 88, 120, 152, 184, 158,
                128, 100, 76,
              ]
              const baseX = 540
              return heights.map((h, i) => (
                <rect
                  key={i}
                  x={baseX + i * 22}
                  y={430 - h}
                  width={18}
                  height={h}
                  fill="url(#g-pipe)"
                  rx="1.5"
                />
              ))
            })()}
          </g>
          <path
            d="M0 540 C 240 520, 480 560, 740 540 S 1180 568, 1420 544 L 1600 552 L 1600 640 L 0 640 Z"
            fill="url(#g-near-hill)"
            opacity="0.85"
          />
        </g>
      )}

      {variant === 'plains' && (
        <g>
          <g opacity="0.55">
            <line
              x1="780"
              y1="430"
              x2="780"
              y2="380"
              stroke="oklch(0.50 0.020 60)"
              strokeWidth="0.8"
            />
            <polygon points="775,392 780,374 785,392" fill="oklch(0.50 0.020 60)" />
          </g>
          <path
            d="M820 470 C 1000 446, 1180 478, 1340 458 S 1560 470, 1600 464 L 1600 640 L 820 640 Z"
            fill="url(#g-near-hill)"
            opacity="0.55"
          />
        </g>
      )}

      {variant === 'trees' && (
        <g>
          {/* Far hills — same shape as 'fields' so the world reads continuous. */}
          <path
            d="M0 430 C 180 420, 360 426, 540 422 S 900 432, 1100 424 S 1400 428, 1600 422 L 1600 470 L 0 470 Z"
            fill="url(#g-far-hill)"
            opacity="0.6"
          />

          {/* Tiny far-hill tree marks */}
          {(
            [
              [200, 426, 7],
              [212, 426, 5],
              [222, 426, 8],
              [340, 425, 6],
              [352, 425, 9],
              [364, 425, 6],
              [950, 425, 6],
              [962, 425, 9],
              [974, 425, 6],
              [1320, 423, 8],
              [1332, 423, 5],
            ] as const
          ).map(([x, y, h], i) => (
            <line
              key={`far-${i}`}
              x1={x}
              y1={y}
              x2={x}
              y2={y - h}
              stroke="oklch(0.54 0.020 60)"
              strokeWidth="0.7"
              opacity="0.6"
            />
          ))}

          {/* Foreground grove — left of centre, balancing the sun on the right. */}
          <g opacity="0.78">
            {/* tree 1 — tall poplar */}
            <line x1="446" y1="430" x2="446" y2="364" stroke="oklch(0.36 0.022 58)" strokeWidth="2" />
            <ellipse cx="446" cy="378" rx="14" ry="32" fill="oklch(0.42 0.024 58)" />
            <ellipse cx="446" cy="368" rx="9" ry="20" fill="oklch(0.38 0.024 56)" opacity="0.85" />

            {/* tree 2 — broad oak, foreground of the cluster */}
            <line x1="478" y1="430" x2="478" y2="392" stroke="oklch(0.36 0.022 58)" strokeWidth="2" />
            <ellipse cx="478" cy="394" rx="22" ry="18" fill="oklch(0.42 0.024 58)" />
            <ellipse cx="472" cy="390" rx="10" ry="9" fill="oklch(0.38 0.024 56)" opacity="0.85" />
            <ellipse cx="486" cy="392" rx="9" ry="8" fill="oklch(0.38 0.024 56)" opacity="0.8" />

            {/* tree 3 — second poplar */}
            <line x1="514" y1="430" x2="514" y2="372" stroke="oklch(0.36 0.022 58)" strokeWidth="2" />
            <ellipse cx="514" cy="386" rx="12" ry="28" fill="oklch(0.42 0.024 58)" />
            <ellipse cx="514" cy="378" rx="7" ry="17" fill="oklch(0.38 0.024 56)" opacity="0.85" />

            {/* low fence ticks tying the grove to the ground */}
            <g stroke="oklch(0.50 0.022 60)" strokeWidth="0.7" opacity="0.55">
              <line x1="430" y1="430" x2="430" y2="424" />
              <line x1="436" y1="430" x2="436" y2="424" />
              <line x1="430" y1="426" x2="540" y2="426" />
              <line x1="540" y1="430" x2="540" y2="424" />
              <line x1="546" y1="430" x2="546" y2="424" />
            </g>
          </g>

          {/* Smaller pair on the far right — balances the sun if shown. */}
          <g opacity="0.6">
            <line x1="1330" y1="430" x2="1330" y2="404" stroke="oklch(0.46 0.022 60)" strokeWidth="1.4" />
            <ellipse cx="1330" cy="408" rx="6" ry="10" fill="oklch(0.46 0.022 60)" />
            <line x1="1346" y1="430" x2="1346" y2="412" stroke="oklch(0.46 0.022 60)" strokeWidth="1.4" />
            <ellipse cx="1346" cy="416" rx="5" ry="8" fill="oklch(0.46 0.022 60)" />
          </g>

          {/* Mid + near hills — same as 'fields' for landscape continuity. */}
          <path
            d="M0 458 C 220 436, 440 472, 660 452 S 1080 476, 1300 450 S 1520 466, 1600 458 L 1600 580 L 0 580 Z"
            fill="url(#g-mid-hill)"
            opacity="0.85"
          />
          <path
            d="M0 510 C 240 492, 480 524, 740 504 S 1180 532, 1420 512 C 1500 504, 1560 510, 1600 514 L 1600 720 L 0 720 Z"
            fill="url(#g-near-hill)"
            opacity="0.85"
          />

          <g stroke="oklch(0.58 0.022 65)" strokeWidth="0.4">
            {Array.from({ length: 30 }).map((_, i) => {
              const y = 580 + i * 4
              const ramp = Math.min(1, i / 10)
              return <line key={i} x1="0" y1={y} x2="1600" y2={y - 2} opacity={0.18 * ramp} />
            })}
          </g>
        </g>
      )}

      <rect x="0" y="0" width="1600" height="860" filter="url(#grain)" opacity="0.55" />
    </svg>
  )
}
