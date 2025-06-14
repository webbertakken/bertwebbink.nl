import { NextResponse } from 'next/server'
import { runMigrationPreparation } from './migration-service'

export async function POST() {
  const result = await runMigrationPreparation()
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
