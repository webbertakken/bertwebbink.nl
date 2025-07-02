/**
 * This component uses Portable Text to render a post body.
 *
 * You can learn more about Portable Text on:
 * https://www.sanity.io/docs/block-content
 * https://github.com/portabletext/react-portabletext
 * https://portabletext.org/
 *
 */

import { PortableText, type PortableTextComponents, type PortableTextBlock } from 'next-sanity'
import { Image } from 'next-sanity/image'
import { stegaClean } from '@sanity/client/stega'
import { getImageDimensions } from '@sanity/asset-utils'

import ResolvedLink from '@/app/components/ResolvedLink'
import { urlForImage } from '@/sanity/lib/utils'

// Helper function to extract video ID from YouTube URLs
function getYouTubeId(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
  return match ? match[1] : null
}

// Helper function to extract video ID from Vimeo URLs
function getVimeoId(url: string) {
  const match = url.match(/vimeo\.com\/(\d+)/)
  return match ? match[1] : null
}

export default function CustomPortableText({
  className,
  value,
}: {
  className?: string
  value: PortableTextBlock[]
}) {
  const components: PortableTextComponents = {
    block: {
      h1: ({ children, value }) => (
        // Add an anchor to the h1
        <h1 className="group relative">
          {children}
          <a
            href={`#${value?._key}`}
            className="absolute left-0 top-0 bottom-0 -ml-6 flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </a>
        </h1>
      ),
      h2: ({ children, value }) => {
        // Add an anchor to the h2
        return (
          <h2 className="group relative">
            {children}
            <a
              href={`#${value?._key}`}
              className="absolute left-0 top-0 bottom-0 -ml-6 flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </a>
          </h2>
        )
      },
    },
    marks: {
      link: ({ children, value: link }) => {
        return <ResolvedLink link={link}>{children}</ResolvedLink>
      },
    },
    types: {
      // Image block support
      image: ({ value }: { value: any }) => {
        if (!value?.asset?._ref) {
          return null
        }

        const dimensions = getImageDimensions(value)

        return (
          <figure className="my-8">
            <Image
              className="w-full h-auto rounded-lg"
              width={dimensions.width}
              height={dimensions.height}
              alt={stegaClean(value?.alt) || ''}
              src={urlForImage(value)?.url() as string}
            />
            {value.caption && (
              <figcaption className="mt-2 text-sm text-gray-600 text-center italic">
                {value.caption}
              </figcaption>
            )}
          </figure>
        )
      },

      // Video block support
      video: ({ value }: { value: any }) => {
        if (!value?.url) {
          return null
        }

                const { videoType, url, title, description, aspectRatio = '16:9' } = value

        // Calculate aspect ratio classes
        const aspectRatioMap = {
          '16:9': 'aspect-video', // 16:9
          '4:3': 'aspect-[4/3]',   // 4:3
          '1:1': 'aspect-square',   // 1:1
          '9:16': 'aspect-[9/16]'   // 9:16
        } as const
        const aspectRatioClass = aspectRatioMap[aspectRatio as keyof typeof aspectRatioMap] || 'aspect-video'

        let embedContent = null

        if (videoType === 'youtube') {
          const videoId = getYouTubeId(url)
          if (videoId) {
            embedContent = (
              <iframe
                className="w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={title || 'YouTube video'}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )
          }
        } else if (videoType === 'vimeo') {
          const videoId = getVimeoId(url)
          if (videoId) {
            embedContent = (
              <iframe
                className="w-full h-full rounded-lg"
                src={`https://player.vimeo.com/video/${videoId}`}
                title={title || 'Vimeo video'}
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            )
          }
        } else if (videoType === 'url') {
          embedContent = (
            <video
              className="w-full h-full rounded-lg"
              controls
              preload="metadata"
            >
              <source src={url} />
              Your browser does not support the video tag.
            </video>
          )
        }

        // Fallback for unrecognized URLs
        if (!embedContent) {
          embedContent = (
            <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-600">Video not available</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  View video
                </a>
              </div>
            </div>
          )
        }

        return (
          <figure className="my-8">
            <div className={`w-full ${aspectRatioClass}`}>
              {embedContent}
            </div>
            {(title || description) && (
              <figcaption className="mt-2 text-sm text-gray-600">
                {title && <div className="font-medium">{title}</div>}
                {description && <div className="mt-1">{description}</div>}
              </figcaption>
            )}
          </figure>
        )
      },

      // Audio block support
      audio: ({ value }: { value: any }) => {
        if (!value?.audioFile?.asset?._ref) {
          return null
        }

        const { title, description, duration, showControls = true, autoplay = false } = value

                // Construct audio URL from Sanity asset
        const fileRef = value.audioFile.asset._ref
        const [, id, extension] = fileRef.match(/^file-(.+)-(\w+)$/) || []
        const audioUrl = id && extension
          ? `https://cdn.sanity.io/files/${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}/${process.env.NEXT_PUBLIC_SANITY_DATASET}/${id}.${extension}`
          : undefined

        if (!audioUrl) {
          return (
            <div className="my-8 p-4 border border-red-200 rounded-lg bg-red-50">
              <p className="text-red-600">Audio file not available</p>
            </div>
          )
        }

        return (
          <figure className="my-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" />
                    <path d="M13.828 8.172a1 1 0 011.414 0A5.983 5.983 0 0117 12a5.983 5.983 0 01-1.758 3.828 1 1 0 11-1.414-1.414A3.987 3.987 0 0015 12a3.987 3.987 0 00-1.172-2.828 1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                {title && (
                  <div className="font-medium text-gray-900 truncate">{title}</div>
                )}
                {duration && (
                  <div className="text-sm text-gray-500">{duration}</div>
                )}
                {description && (
                  <div className="text-sm text-gray-600 mt-1">{description}</div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <audio
                className="w-full"
                controls={showControls}
                autoPlay={autoplay}
                preload="metadata"
              >
                <source src={audioUrl} />
                Your browser does not support the audio element.
              </audio>
            </div>
          </figure>
        )
      },
    },
  }

  return (
    <div className={['prose prose-a:text-brand', className].filter(Boolean).join(' ')}>
      <PortableText components={components} value={value} />
    </div>
  )
}
