export interface MediaReference {
  url: string
  localPath: string
  type: 'image' | 'audio'
}

export interface SanityPost {
  title: string
  slug: string
  publishedAt: string
  body: string
  excerpt: string
  media: MediaReference[]
}

export interface MigrationRecord {
  original: any
  transformed: SanityPost
}

export interface MigrationStep {
  title: string
  description: string
  link?: string
}
