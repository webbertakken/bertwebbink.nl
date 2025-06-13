import { NextResponse } from 'next/server'
import { prepareMigration } from './prepare-migration'
import fs from 'fs'
import path from 'path'

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    if (
      'message' in error &&
      typeof (error as any).message === 'string' &&
      (error as any).message
    ) {
      return (error as any).message
    }
    if ('sqlMessage' in error && typeof (error as any).sqlMessage === 'string') {
      return (error as any).sqlMessage
    }
    if ('code' in error && typeof (error as any).code === 'string') {
      return (error as any).code
    }
    if ('toString' in error && typeof (error as any).toString === 'function') {
      return (error as any).toString()
    }
  }
  if (typeof error === 'string') return error
  return 'Unknown error'
}

function getDatabaseErrorGuidance(error: unknown): string {
  const errorMessage = extractErrorMessage(error)
  if (errorMessage.includes('ECONNREFUSED')) {
    return `Database connection refused. Please check that:\n1. MySQL server is running on localhost:3306\n2. You can connect using these credentials:\n   - Host: localhost\n   - Port: 3306\n   - User: root\n   - Password: P@ssw0rd!\n   - Database: wordpress`
  }
  if (errorMessage.includes('ER_ACCESS_DENIED_ERROR')) {
    return `Database access denied. Please verify these credentials:\n1. User: root\n2. Password: P@ssw0rd!\n3. Database: wordpress`
  }
  if (errorMessage.includes('ER_BAD_DB_ERROR')) {
    return `Database 'wordpress' does not exist. Please:\n1. Create a database named 'wordpress'\n2. Import your WordPress database if you haven't already`
  }
  if (errorMessage.includes('ETIMEDOUT')) {
    return `Database connection timed out. Please check:\n1. MySQL server is running\n2. No firewall is blocking port 3306\n3. MySQL server is accepting connections from localhost`
  }
  return 'An unexpected database error occurred'
}

export async function POST() {
  try {
    // Run the migration preparation
    try {
      await prepareMigration(false)
    } catch (error) {
      console.error('Migration preparation error:', error)
      const errorMessage = extractErrorMessage(error)
      const isDatabaseError =
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ER_ACCESS_DENIED_ERROR') ||
        errorMessage.includes('ER_BAD_DB_ERROR') ||
        errorMessage.includes('ETIMEDOUT')
      const response = {
        success: false,
        error: isDatabaseError ? 'Database Connection Error' : 'Migration preparation failed',
        details: {
          message: errorMessage,
          guidance: isDatabaseError ? getDatabaseErrorGuidance(error) : undefined,
          stack: error instanceof Error ? error.stack : undefined,
          cwd: process.cwd(),
        },
      }
      console.log('Sending error response:', JSON.stringify(response, null, 2))
      return NextResponse.json(response, { status: 500 })
    }

    // Read the output file
    const outputPath = path.join(process.cwd(), 'input', 'sanity-migration.json')
    let fileContent: string
    try {
      fileContent = fs.readFileSync(outputPath, 'utf8')
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to read migration output file',
          details: {
            message: 'Could not read the generated sanity-migration.json file',
            path: outputPath,
            error: extractErrorMessage(error),
          },
        },
        { status: 500 },
      )
    }

    // Parse the JSON
    let posts: any[]
    try {
      posts = JSON.parse(fileContent)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in migration output file',
          details: {
            message: 'The generated sanity-migration.json file contains invalid JSON',
            path: outputPath,
            error: extractErrorMessage(error),
            preview: fileContent.slice(0, 200) + '...', // Show first 200 chars for debugging
          },
        },
        { status: 500 },
      )
    }

    const first20Lines = fileContent.split('\n').slice(0, 20).join('\n')
    return NextResponse.json({
      success: true,
      message: 'Migration preparation completed successfully',
      data: {
        postCount: posts.length,
        preview: first20Lines,
        outputPath,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error during migration preparation',
        details: {
          message: extractErrorMessage(error),
          stack: error instanceof Error ? error.stack : undefined,
          cwd: process.cwd(),
        },
      },
      { status: 500 },
    )
  }
}
