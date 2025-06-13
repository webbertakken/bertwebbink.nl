import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'input', 'sanity-migration.json')

    // Check if file exists first
    try {
      await fs.access(filePath)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Migration file not found',
          details: {
            message: 'The sanity-migration.json file does not exist in the input directory',
            path: filePath,
            cwd: process.cwd(),
            error: error instanceof Error ? error.message : String(error),
          },
        },
        { status: 404 },
      )
    }

    // Try to read the file
    let fileContent: string
    try {
      fileContent = await fs.readFile(filePath, 'utf-8')
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to read migration file',
          details: {
            message: 'Could not read the sanity-migration.json file',
            path: filePath,
            error: error instanceof Error ? error.message : String(error),
          },
        },
        { status: 500 },
      )
    }

    // Try to parse the JSON
    let data: any
    try {
      data = JSON.parse(fileContent)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in migration file',
          details: {
            message: 'The sanity-migration.json file contains invalid JSON',
            path: filePath,
            error: error instanceof Error ? error.message : String(error),
            preview: fileContent.slice(0, 200) + '...', // Show first 200 chars for debugging
          },
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error while processing migration data',
        details: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          cwd: process.cwd(),
        },
      },
      { status: 500 },
    )
  }
}
