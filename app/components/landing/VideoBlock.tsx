'use client'

import { useState } from 'react'

type VideoBlockProps = {
  videoType: 'youtube' | 'vimeo' | 'url'
  url?: string | null
  fileUrl?: string | null
  title?: string | null
  description?: string | null
  duration?: string | null
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16'
}

const ASPECT: Record<NonNullable<VideoBlockProps['aspectRatio']>, string> = {
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square',
  '9:16': 'aspect-[9/16]',
}

const IconPlayLarge = () => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
    className="w-[22px] h-[22px] translate-x-0.5"
  >
    <polygon points="3,2 13,8 3,14" />
  </svg>
)

const youTubeId = (url: string) => {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
  return m ? m[1] : null
}
const vimeoId = (url: string) => {
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m ? m[1] : null
}

export function VideoBlock({
  videoType,
  url,
  fileUrl,
  title,
  description,
  duration,
  aspectRatio = '16:9',
}: VideoBlockProps) {
  const [playing, setPlaying] = useState(false)
  const aspect = ASPECT[aspectRatio]

  let embed: React.ReactNode = null
  if (videoType === 'youtube' && url) {
    const id = youTubeId(url)
    if (id) {
      embed = (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${id}?autoplay=1`}
          title={title || 'Video'}
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )
    }
  } else if (videoType === 'vimeo' && url) {
    const id = vimeoId(url)
    if (id) {
      embed = (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://player.vimeo.com/video/${id}?autoplay=1`}
          title={title || 'Video'}
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      )
    }
  } else if (videoType === 'url' && fileUrl) {
    embed = (
      <video
        className="absolute inset-0 w-full h-full bg-ink"
        controls
        autoPlay
        preload="metadata"
        src={fileUrl}
      >
        Your browser does not support the video tag.
      </video>
    )
  }

  return (
    <figure className="my-9 mb-8">
      <div
        className={`relative rounded overflow-hidden border border-rule-soft ${aspect}`}
        style={
          playing
            ? undefined
            : {
                background:
                  'repeating-linear-gradient(135deg, oklch(0.30 0.012 70) 0 24px, oklch(0.26 0.014 68) 24px 48px)',
              }
        }
        aria-label={title ? `Video — ${title}` : 'Video'}
      >
        {playing && embed}
        {!playing && (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            disabled={!embed}
            aria-label={embed ? 'Play video' : 'Video unavailable'}
            className="absolute inset-0 flex items-center justify-center cursor-pointer bg-transparent border-none p-0 disabled:cursor-not-allowed"
          >
            <span className="w-[76px] h-[76px] rounded-full bg-[oklch(0.99_0.004_85/0.92)] backdrop-blur-md flex items-center justify-center text-ink transition-all duration-200 hover:scale-105 hover:bg-[oklch(0.99_0.004_85)]">
              <IconPlayLarge />
            </span>
          </button>
        )}
        {!playing && (title || duration) && (
          <span className="absolute bottom-3.5 left-3.5 font-mono text-[10.5px] tracking-[0.16em] uppercase text-[oklch(0.92_0.004_85)] bg-[oklch(0.22_0.012_70/0.5)] px-2.5 py-[5px] rounded-sm pointer-events-none">
            {[title, duration].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>
      {description && (
        <figcaption className="mt-3 font-serif italic text-[14.5px] leading-[1.5] text-ink-soft">
          {description}
        </figcaption>
      )}
    </figure>
  )
}
