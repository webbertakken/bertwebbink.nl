import mysql2 from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { parse } from 'node-html-parser'
import { RowDataPacket } from 'mysql2'
import { WordPressPost, MediaReference, SanityContent, MigrationRecord } from '@/types/migration'

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

function buildWordPressPageHierarchy(pages: WordPressPost[]): void {
  const pageMap = new Map<number, WordPressPost>()
  
  // Create a map of all pages by ID
  pages.forEach(page => {
    pageMap.set(page.ID, page)
  })

  // Log page hierarchy information
  const topLevelPages = pages.filter(page => page.post_parent === 0)
  const childPages = pages.filter(page => page.post_parent > 0)
  
  console.log(`Page hierarchy analysis:`)
  console.log(`- Top-level pages: ${topLevelPages.length}`)
  console.log(`- Child pages: ${childPages.length}`)
  
  // Log parent-child relationships
  childPages.forEach(child => {
    const parent = pageMap.get(child.post_parent)
    if (parent) {
      console.log(`  └─ "${child.post_title}" is child of "${parent.post_title}"`)
    } else {
      console.log(`  └─ "${child.post_title}" has missing parent ID: ${child.post_parent}`)
    }
  })
}

export async function prepareMigration(dryRun: boolean = false) {
  try {
    // Connect to WordPress database
    const connection = await mysql2.createConnection(dbConfig)

    // Fetch all published posts and pages
    const [content] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM wp_posts WHERE post_type IN ("post", "page") AND post_status = "publish" ORDER BY post_type, post_date DESC LIMIT 10000',
    )
    const typedContent = content as WordPressPost[]

    console.log(`Found ${typedContent.length} items to migrate`)
    const posts = typedContent.filter(item => item.post_type === 'post')
    const pages = typedContent.filter(item => item.post_type === 'page')
    console.log(`- Posts: ${posts.length}`)
    console.log(`- Pages: ${pages.length}`)

    // Analyze page hierarchy
    if (pages.length > 0) {
      buildWordPressPageHierarchy(pages)
    }

    const migrationRecords: MigrationRecord[] = []

    // Process each piece of content
    for (const item of typedContent) {
      console.log(`Processing ${item.post_type}: ${item.post_title}`)

      // Extract media references from content
      const mediaRefs = await extractMediaFromContent(item.post_content)

      // Validate media files
      const validMediaRefs = await validateMediaFiles(mediaRefs)

      // Build Sanity content object
      const sanityContent: SanityContent = {
        title: item.post_title,
        slug: item.post_name,
        publishedAt: item.post_date,
        body: item.post_content,
        excerpt: item.post_excerpt,
        media: validMediaRefs,
        contentType: item.post_type,
        parentId: item.post_parent > 0 ? item.post_parent : undefined,
        menuOrder: item.post_type === 'page' ? item.menu_order : undefined,
      }

      migrationRecords.push({
        original: item,
        transformed: sanityContent,
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
