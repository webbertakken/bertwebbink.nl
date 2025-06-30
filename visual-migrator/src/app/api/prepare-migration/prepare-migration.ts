import mysql2 from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { RowDataPacket } from 'mysql2'
import { WordPressPost, SanityContent, MigrationRecord } from '@/types/migration'
import { extractMediaFromContent, mapMediaToLocalPaths, replaceMediaUrls, generateMediaStats } from '@/utils/media-processor'

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
    const totalMediaStats = { totalImages: 0, totalAudio: 0, totalVideo: 0, totalFound: 0, totalMissing: 0 }

    // Process each piece of content
    for (const item of typedContent) {
      console.log(`Processing ${item.post_type}: ${item.post_title}`)

      // Extract media references from content
      const mediaRefs = extractMediaFromContent(item.post_content)

      // Map URLs to local file paths
      const mappedMediaRefs = mapMediaToLocalPaths(mediaRefs)

      // Replace URLs in content with local references
      const updatedContent = replaceMediaUrls(item.post_content, mappedMediaRefs)

      // Generate stats for this item
      const itemStats = generateMediaStats(mappedMediaRefs)
      totalMediaStats.totalImages += itemStats.totalImages
      totalMediaStats.totalAudio += itemStats.totalAudio  
      totalMediaStats.totalVideo += itemStats.totalVideo
      totalMediaStats.totalFound += itemStats.totalFound
      totalMediaStats.totalMissing += itemStats.totalMissing

      if (mappedMediaRefs.length > 0) {
        console.log(`  - Found ${mappedMediaRefs.length} media references (${itemStats.totalFound} found, ${itemStats.totalMissing} missing)`)
      }

      // Build Sanity content object
      const sanityContent: SanityContent = {
        title: item.post_title,
        slug: item.post_name,
        publishedAt: item.post_date,
        body: updatedContent,
        excerpt: item.post_excerpt,
        media: mappedMediaRefs,
        contentType: item.post_type,
        parentId: item.post_parent > 0 ? item.post_parent : undefined,
        menuOrder: item.post_type === 'page' ? item.menu_order : undefined,
      }

      migrationRecords.push({
        original: item,
        transformed: sanityContent,
      })
    }

    // Log overall media statistics
    console.log('\nMedia Processing Summary:')
    console.log(`- Images: ${totalMediaStats.totalImages}`)
    console.log(`- Audio: ${totalMediaStats.totalAudio}`)
    console.log(`- Video: ${totalMediaStats.totalVideo}`)
    console.log(`- Found locally: ${totalMediaStats.totalFound}`)
    console.log(`- Missing: ${totalMediaStats.totalMissing}`)

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
