'use client'

import React, { useState } from 'react'

export const PrepareMigrationUI: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [postCount, setPostCount] = useState<number | null>(null)
  const [first20Lines, setFirst20Lines] = useState<string | null>(null)

  const runPrepareMigration = async () => {
    setLoading(true)
    setResult(null)
    setError(null)
    setPostCount(null)
    setFirst20Lines(null)
    try {
      const response = await fetch('/api/prepare-migration', { method: 'POST' })
      const data = await response.json()
      console.log('API Response:', data)

      if (!response.ok || !data.success) {
        throw new Error(
          JSON.stringify({
            message: data.error,
            details: data.details,
          }),
        )
      }

      setResult(data.message || 'Migration preparation completed successfully.')
      if (data.data?.postCount !== undefined) {
        setPostCount(data.data.postCount)
      }
      if (data.data?.preview !== undefined) {
        setFirst20Lines(data.data.preview)
      }
    } catch (err) {
      console.error('Error caught:', err)
      setError(err instanceof Error ? err.message : 'Failed to run migration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Prepare Migration</h2>
      <p className="mb-4">Run the migration preparation script and generate the migration data.</p>
      <button
        onClick={runPrepareMigration}
        disabled={loading}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition mb-4"
      >
        {loading ? 'Running...' : 'Run Prepare Migration'}
      </button>
      {result && (
        <div className="mt-2">
          <div className="text-green-500">{result}</div>
          {postCount !== null && (
            <div className="mt-2">
              <h2 className="text-xl font-semibold">Number of Posts: {postCount}</h2>
            </div>
          )}
          {first20Lines !== null && (
            <div className="mt-2">
              <h2 className="text-xl font-semibold">First 20 Lines of Migration File:</h2>
              <pre className="bg-gray-100 p-4 rounded">{first20Lines}</pre>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="mt-4">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-red-400">Error</h2>
            <div className="space-y-4">
              {(() => {
                try {
                  const errorData = JSON.parse(error)
                  return (
                    <>
                      <p className="text-red-200">{errorData.message}</p>
                      {errorData.details && (
                        <div className="mt-4">
                          {errorData.details.guidance && (
                            <div className="mb-4">
                              <h3 className="text-lg font-semibold text-red-300 mb-2">
                                Troubleshooting Steps:
                              </h3>
                              <div className="bg-gray-900/50 p-4 rounded text-sm text-gray-300">
                                {errorData.details.guidance
                                  .split('\n')
                                  .map((line: string, index: number) => (
                                    <p key={index} className="mb-2">
                                      {line}
                                    </p>
                                  ))}
                              </div>
                            </div>
                          )}
                          <h3 className="text-lg font-semibold text-red-300 mb-2">
                            Technical Details:
                          </h3>
                          <div className="bg-gray-900/50 p-4 rounded text-sm text-gray-300">
                            {errorData.details.stack && (
                              <div className="mb-4">
                                <h4 className="font-semibold mb-2">Error Stack:</h4>
                                <div className="whitespace-pre-wrap">
                                  {errorData.details.stack.split('\n').slice(0, 3).join('\n')}
                                </div>
                              </div>
                            )}
                            {errorData.details.cwd && (
                              <div className="mb-4">
                                <h4 className="font-semibold mb-2">Working Directory:</h4>
                                <div>{errorData.details.cwd}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )
                } catch (e) {
                  console.error('Error parsing error message:', e)
                  return <p className="text-red-200">{error}</p>
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
