'use client'

import React, { useState } from 'react'

interface DockerStep {
  step: string
  cmd: string
  stdout: string
  stderr: string
  success: boolean
  info?: boolean
}

interface DockerResponse {
  success: boolean
  message?: string
  error?: string
  details?: {
    stack?: string
    stdout?: string
    stderr?: string
    code?: number
    cwd?: string
    guidance?: string
  }
  steps: DockerStep[]
}

export const DockerManagerUI: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [steps, setSteps] = useState<DockerStep[]>([])

  const handleDockerOperation = async (operation: 'start' | 'stop') => {
    setLoading(true)
    setResult(null)
    setError(null)
    setSteps([])

    try {
      const response = await fetch('/api/docker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operation }),
      })
      const data: DockerResponse = await response.json()
      console.log('API Response:', data)

      if (!response.ok || !data.success) {
        throw new Error(
          JSON.stringify({
            message: data.error,
            details: data.details,
            steps: data.steps,
          }),
        )
      }

      setResult(data.message || null)
      setSteps(data.steps || [])
    } catch (err) {
      console.error('Error caught:', err)

      // Network error (fetch failed)
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError(
          JSON.stringify({
            message: 'Could not connect to the backend server. Is it running?',
            details: { raw: err.message },
          }),
        )
        return
      }

      // Try to parse error as JSON, fallback to raw error
      if (err instanceof Error && typeof err.message === 'string') {
        try {
          const errorData = JSON.parse(err.message)
          if (errorData.steps && Array.isArray(errorData.steps)) {
            setSteps(errorData.steps)
          }
          setError(err.message)
          return
        } catch {
          // Not JSON, fall through
        }
      }

      // Fallback: show raw error
      setError(
        JSON.stringify({
          message: 'Unexpected error occurred.',
          details: { raw: err instanceof Error ? err.message : String(err) },
        }),
      )
    } finally {
      setLoading(false)
    }
  }

  const renderStep = (step: DockerStep, index: number) => {
    const isNoSuchContainer =
      (step.stderr && step.stderr.includes('No such container')) || step.info
    const statusLabel = isNoSuchContainer ? 'Info' : step.success ? 'Success' : 'Failed'
    const statusClass = isNoSuchContainer
      ? 'bg-blue-900/50 text-blue-300'
      : step.success
        ? 'bg-green-900/50 text-green-300'
        : 'bg-red-900/50 text-red-300'
    return (
      <div key={index} className="mb-6 border border-gray-700 rounded-lg overflow-hidden">
        <div
          className={`p-4 ${isNoSuchContainer ? 'bg-blue-900/20' : step.success ? 'bg-gray-800' : 'bg-red-900/50'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">{step.step}</h3>
            <span className={`px-2 py-1 rounded text-sm ${statusClass}`}>{statusLabel}</span>
          </div>
          <div className="mb-2">
            <span className="text-gray-400 text-sm">Command:</span>
            <pre className="mt-1 bg-gray-900/50 p-2 rounded text-sm font-mono">{step.cmd}</pre>
          </div>
          {step.stdout && (
            <div className="mb-2">
              <span className="text-gray-400 text-sm">Output:</span>
              <pre className="mt-1 bg-gray-900/50 p-2 rounded text-sm font-mono whitespace-pre-wrap">
                {step.stdout}
              </pre>
            </div>
          )}
          {step.stderr && (
            <div>
              <span className="text-red-400 text-sm">Error:</span>
              <pre className="mt-1 bg-gray-900/50 p-2 rounded text-sm font-mono whitespace-pre-wrap text-red-400">
                {step.stderr}
              </pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Docker Container Manager</h2>
      <p className="mb-4">Start or stop the Docker container for the migration process.</p>

      <div className="flex gap-4 mb-4">
        <button
          onClick={() => handleDockerOperation('start')}
          disabled={loading}
          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Start Container'}
        </button>

        <button
          onClick={() => handleDockerOperation('stop')}
          disabled={loading}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Stop Container'}
        </button>
      </div>

      {loading && <div className="mt-4 text-gray-400">Running Docker operation...</div>}

      {error && (
        <div className="mt-4">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-red-400">Error</h2>
            <div className="space-y-4">
              {(() => {
                try {
                  const errorData = JSON.parse(error)
                  const details = errorData.details || {}
                  const hasTechnicalDetails = Boolean(
                    (typeof details.stack === 'string' && details.stack.trim()) ||
                      (typeof details.cwd === 'string' && details.cwd.trim()) ||
                      (typeof details.stdout === 'string' && details.stdout.trim()) ||
                      (typeof details.stderr === 'string' && details.stderr.trim()) ||
                      typeof details.code === 'number',
                  )
                  return (
                    <>
                      <p className="text-red-200">{errorData.message}</p>
                      {details.guidance && (
                        <div className="mt-4">
                          <h3 className="text-lg font-semibold text-red-300 mb-2">
                            Troubleshooting Steps:
                          </h3>
                          <div className="bg-gray-900/50 p-4 rounded text-sm text-gray-300">
                            {details.guidance.split('\n').map((line: string, index: number) => (
                              <p key={index} className="mb-2">
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      {hasTechnicalDetails && (
                        <>
                          <h3 className="text-lg font-semibold text-red-300 mb-2">
                            Technical Details:
                          </h3>
                          <div className="bg-gray-900/50 p-4 rounded text-sm text-gray-300">
                            {details.stack && details.stack.trim() && (
                              <div className="mb-4">
                                <h4 className="font-semibold mb-2">Error Stack:</h4>
                                <div className="whitespace-pre-wrap">
                                  {details.stack.split('\n').slice(0, 3).join('\n')}
                                </div>
                              </div>
                            )}
                            {details.cwd && details.cwd.trim() && (
                              <div className="mb-4">
                                <h4 className="font-semibold mb-2">Working Directory:</h4>
                                <div>{details.cwd}</div>
                              </div>
                            )}
                            {details.stdout && details.stdout.trim() && (
                              <div className="mb-4">
                                <h4 className="font-semibold mb-2">Command Output:</h4>
                                <div className="whitespace-pre-wrap">{details.stdout}</div>
                              </div>
                            )}
                            {details.stderr && details.stderr.trim() && (
                              <div className="mb-4">
                                <h4 className="font-semibold mb-2">Error Output:</h4>
                                <div className="whitespace-pre-wrap text-red-400">
                                  {details.stderr}
                                </div>
                              </div>
                            )}
                            {typeof details.code === 'number' && details.code !== undefined && (
                              <div className="mb-4">
                                <h4 className="font-semibold mb-2">Exit Code:</h4>
                                <div>{details.code}</div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )
                } catch {
                  return (
                    <div>
                      <p className="text-red-200">Could not parse error as JSON.</p>
                    </div>
                  )
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <div className="text-green-500 mb-4">{result}</div>
        </div>
      )}

      {steps.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-4">Operation Steps:</h2>
          <div className="space-y-4">{steps.map(renderStep)}</div>
        </div>
      )}
    </div>
  )
}
