import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(req: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'input', 'sanity-migration.json')
    const data = await fs.readFile(filePath, 'utf-8')
    return NextResponse.json(JSON.parse(data))
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Could not read sanity-migration.json',
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 },
    )
  }
}
