import { NextResponse } from 'next/server'
import { prepareMigration } from '../prepare-migration'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    await prepareMigration(false)
    const outputPath = path.join(process.cwd(), 'input', 'sanity-migration.json')
    const fileContent = fs.readFileSync(outputPath, 'utf8')
    const posts = JSON.parse(fileContent)
    const first20Lines = fileContent.split('\n').slice(0, 20).join('\n')
    return NextResponse.json({
      success: true,
      message: 'Migration preparation completed successfully',
      postCount: posts.length,
      first20Lines,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
