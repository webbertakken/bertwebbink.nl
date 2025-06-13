import mysql2 from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { parse } from 'node-html-parser'
import { RowDataPacket } from 'mysql2'

// Load environment variables if needed
// require('dotenv').config();

// MySQL connection configuration
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root', // Update with your WordPress DB credentials
  password: 'P@ssw0rd!', // Update with your WordPress DB credentials
  database: 'wordpress', // Update with your WordPress DB name
}

interface WordPressPost {
  ID: number
  post_title: string
  post_content: string
  post_excerpt: string
  post_date: string
  post_modified: string
  post_status: string
  post_name: string
  guid: string
}

interface MediaReference {
  url: string
  localPath: string
  type: 'image' | 'audio'
}

interface SanityPost {
  title: string
  slug: string
  publishedAt: string
  body: string
  excerpt: string
  media: MediaReference[]
}

interface MigrationRecord {
  original: WordPressPost
  transformed: SanityPost
}

async function extractMediaFromContent(content: string): Promise<MediaReference[]> {
  const root = parse(content)
  const mediaRefs: MediaReference[] = []

  // Extract image URLs
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src')
    if (src) {
      const localPath = path.join(process.cwd(), 'uploads', path.basename(src))
      mediaRefs.push({ url: src, localPath, type: 'image' })
    }
  })

  // Extract audio URLs
  root.querySelectorAll('audio source').forEach((source) => {
    const src = source.getAttribute('src')
    if (src) {
      const localPath = path.join(process.cwd(), 'uploads', path.basename(src))
      mediaRefs.push({ url: src, localPath, type: 'audio' })
    }
  })

  return mediaRefs
}

async function validateMediaFiles(mediaRefs: MediaReference[]): Promise<MediaReference[]> {
  const validRefs: MediaReference[] = []
  for (const ref of mediaRefs) {
    if (fs.existsSync(ref.localPath)) {
      validRefs.push(ref)
    } else {
      console.error(`File not found: ${ref.localPath}`)
    }
  }
  return validRefs
}

export async function prepareMigration(dryRun: boolean = false) {
  try {
    // Connect to WordPress database
    const connection = await mysql2.createConnection(dbConfig)

    // Fetch all published posts
    const [posts] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM wp_posts WHERE post_type = "post" AND post_status = "publish" LIMIT 10000',
    )
    const typedPosts = posts as WordPressPost[]

    console.log(`Found ${typedPosts.length} posts to migrate`)

    const migrationRecords: MigrationRecord[] = []

    // Process each post
    for (const post of typedPosts) {
      console.log(`Processing post: ${post.post_title}`)

      // Extract media references from content
      const mediaRefs = await extractMediaFromContent(post.post_content)

      // Validate media files
      const validMediaRefs = await validateMediaFiles(mediaRefs)

      // Build Sanity post object
      const sanityPost: SanityPost = {
        title: post.post_title,
        slug: post.post_name,
        publishedAt: post.post_date,
        body: post.post_content,
        excerpt: post.post_excerpt,
        media: validMediaRefs,
      }

      migrationRecords.push({
        original: post,
        transformed: sanityPost,
      })
    }

    // Write to JSON file if not in dry run mode
    if (!dryRun) {
      const outputPath = path.join(process.cwd(), 'input', 'sanity-migration.json')
      fs.writeFileSync(outputPath, JSON.stringify(migrationRecords, null, 2))
      console.log(`Migration data written to ${outputPath}`)
    } else {
      console.log('Dry run completed. No files written.')
    }

    await connection.end()
    console.log('Migration preparation completed successfully')
  } catch (error) {
    console.error('Migration preparation failed:', error)
    throw error
  }
}
