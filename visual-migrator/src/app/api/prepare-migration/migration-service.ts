import { prepareMigration } from './prepare-migration'
import { readMigrationFile, getMigrationFilePreview, MIGRATION_FILE_PATH } from './file-operations'
import { handleMigrationError } from './error-handling'

export interface MigrationResult {
  success: boolean
  message?: string
  error?: string
  details?: Record<string, unknown>
  data?: {
    postCount: number
    preview: string
    outputPath: string
  }
}

export async function runMigrationPreparation(): Promise<MigrationResult> {
  try {
    // Run the migration preparation
    await prepareMigration(false)

    // Read and parse the output file
    const { data, rawContent } = await readMigrationFile()
    const posts = data as unknown[]

    return {
      success: true,
      message: 'Migration preparation completed successfully',
      data: {
        postCount: posts.length,
        preview: getMigrationFilePreview(rawContent),
        outputPath: MIGRATION_FILE_PATH,
      },
    }
  } catch (error) {
    const migrationError = handleMigrationError(error)
    return {
      success: false,
      error: migrationError.message,
      details: migrationError.details,
    }
  }
}
