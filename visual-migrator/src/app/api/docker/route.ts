import { NextResponse } from 'next/server'
import { checkContainerStatus } from './check-container-status'
import { executeContainerCommand, ContainerCommand } from './execute-container-command'

export async function POST(request: Request) {
  try {
    const { operation } = await request.json()
    const command = operation as ContainerCommand

    // Validate operation
    if (!command || !['start', 'stop'].includes(command)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid operation',
          details: {
            guidance: 'Operation must be either "start" or "stop"',
          },
        },
        { status: 400 },
      )
    }

    // Check container status first
    const statusResult = await checkContainerStatus()
    if (!statusResult.success) {
      return NextResponse.json(statusResult, { status: 400 })
    }

    // Execute the command
    const result = await executeContainerCommand(command)
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    })
  } catch (error) {
    console.error('Unexpected error in Docker API route:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: {
          stack: error instanceof Error ? error.stack || String(error) : String(error),
        },
      },
      { status: 500 },
    )
  }
}
