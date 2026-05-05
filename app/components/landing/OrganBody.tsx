import { getImageDimensions } from '@sanity/asset-utils'
import { stegaClean } from '@sanity/client/stega'
import { PortableText, type PortableTextComponents, type PortableTextBlock } from 'next-sanity'
import { Image } from 'next-sanity/image'
import { LightboxImage } from '@/app/components/lightbox/LightboxImage'
import ResolvedLink from '@/app/components/ResolvedLink'
import { dataset, projectId } from '@/sanity/lib/api'
import { urlForImage } from '@/sanity/lib/utils'
import { AudioBlock } from './AudioBlock'
import { VideoBlock } from './VideoBlock'

const ALIGNMENT: Record<string, string> = {
  left: 'mr-auto max-w-[60%]',
  right: 'ml-auto max-w-[60%]',
  center: 'mx-auto max-w-full',
}

function buildAudioUrl(ref?: string): string | null {
  if (!ref) return null
  const m = ref.match(/^file-(.+)-(\w+)$/)
  if (!m) return null
  const [, id, ext] = m
  return `https://cdn.sanity.io/files/${projectId}/${dataset}/${id}.${ext}`
}

function buildFileUrl(ref?: string): string | null {
  return buildAudioUrl(ref)
}

function buildComponents(organId: string): PortableTextComponents {
  return {
    block: {
      normal: ({ children }) => (
        <p className="text-[17px] leading-[1.72] text-ink m-0 mb-[22px] text-pretty">{children}</p>
      ),
      h2: ({ children }) => (
        <h2
          className="font-serif font-medium text-[28px] leading-[1.2] mt-12 mb-[18px] text-ink"
          style={{ letterSpacing: '0.002em' }}
        >
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="font-serif font-medium text-[22px] leading-[1.25] mt-10 mb-3 text-ink">
          {children}
        </h3>
      ),
      h4: ({ children }) => (
        <h4 className="font-serif font-medium text-lg leading-[1.3] mt-8 mb-2 text-ink">
          {children}
        </h4>
      ),
      blockquote: ({ children }) => (
        <blockquote className="font-serif italic font-light text-[28px] leading-[1.32] text-ink my-10 pl-[22px] border-l-2 border-accent text-balance">
          {children}
        </blockquote>
      ),
    },
    list: {
      bullet: ({ children }) => (
        <ul className="list-disc pl-6 mb-[22px] text-[17px] leading-[1.72] text-ink space-y-1.5">
          {children}
        </ul>
      ),
      number: ({ children }) => (
        <ol className="list-decimal pl-6 mb-[22px] text-[17px] leading-[1.72] text-ink space-y-1.5">
          {children}
        </ol>
      ),
    },
    marks: {
      em: ({ children }) => <em className="italic">{children}</em>,
      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      link: ({ children, value }) => <ResolvedLink link={value}>{children}</ResolvedLink>,
    },
    types: {
      image: ({ value }: { value: any }) => {
        if (!value?.asset?._ref) return null
        const dim = getImageDimensions(value)
        const align = ALIGNMENT[value.alignment as string] ?? ALIGNMENT.center
        const alt = stegaClean(value?.alt) || ''
        // Cap inline body images at 2000px wide. Smaller payload for the
        // page and a Sanity-cached transform that the lightbox reuses.
        const src = urlForImage(value)?.width(2000).fit('clip').url() as string
        return (
          <figure className={`my-9 ${align}`}>
            <LightboxImage src={src} alt={alt}>
              <Image
                className="w-full h-auto rounded border border-rule-soft"
                width={dim.width}
                height={dim.height}
                alt={alt}
                src={src}
              />
            </LightboxImage>
            {value.caption && (
              <figcaption className="mt-3 font-serif italic text-[14.5px] leading-[1.5] text-ink-soft text-center">
                {value.caption}
              </figcaption>
            )}
          </figure>
        )
      },
      audio: ({ value }: { value: any }) => {
        const src = buildAudioUrl(value?.audioFile?.asset?._ref)
        if (!src) return null
        return (
          <AudioBlock
            src={src}
            title={value.title}
            kind={value.kind}
            description={value.description}
            duration={value.duration}
            organId={organId}
            blockKey={value._key}
          />
        )
      },
      video: ({ value }: { value: any }) => (
        <VideoBlock
          videoType={value.videoType}
          url={value.url}
          fileUrl={buildFileUrl(value?.videoFile?.asset?._ref)}
          title={value.title}
          description={value.description}
          aspectRatio={value.aspectRatio}
        />
      ),
      divider: () => (
        <div className="my-12 flex items-center justify-center gap-3.5 text-ink-faint">
          <span className="w-9 h-px bg-current opacity-50" />
          <span className="w-[5px] h-[5px] rounded-full bg-accent" />
          <span className="w-9 h-px bg-current opacity-50" />
        </div>
      ),
      embed: ({ value }: { value: any }) => {
        if (!value?.url) return null
        return (
          <figure className="my-9">
            <div className="aspect-video w-full overflow-hidden rounded border border-rule-soft">
              <iframe
                className="w-full h-full"
                src={value.url}
                title={value.caption || 'Embedded content'}
                sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
                allowFullScreen
              />
            </div>
            {value.caption && (
              <figcaption className="mt-3 font-serif italic text-[14.5px] leading-[1.5] text-ink-soft text-center">
                {value.caption}
              </figcaption>
            )}
          </figure>
        )
      },
    },
  }
}

export function OrganBody({ value, organId }: { value: PortableTextBlock[]; organId: string }) {
  const components = buildComponents(organId)
  return (
    <article className="max-w-[640px] mx-auto text-ink">
      <PortableText value={value} components={components} />
    </article>
  )
}
