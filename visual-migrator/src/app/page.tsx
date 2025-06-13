"use client";

import React, { useState } from "react";
import VerifyMigrationUI from "./verify-migration-ui";

const steps = [
  {
    title: "Prepare Migration",
    description: "Run the migration preparation script and generate the migration data.",
    link: "/verify-migration",
  },
  {
    title: "Verify Migration",
    description: "Visually inspect and verify the migration data before import.",
  },
  {
    title: "Next Step (Placeholder)",
    description: "Continue to the next step of your migration process.",
  },
];

function PrepareMigrationUI() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [first20Lines, setFirst20Lines] = useState<string | null>(null);

  const runPrepareMigration = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    setPostCount(null);
    setFirst20Lines(null);
    try {
      const response = await fetch("/api/prepare-migration", { method: "POST" });
      const data = await response.json();
      console.log('API Response:', data);

      if (!response.ok || !data.success) {
        throw new Error(JSON.stringify({
          message: data.error,
          details: data.details
        }));
      }

      setResult(data.message || "Migration preparation completed successfully.");
      if (data.data?.postCount !== undefined) {
        setPostCount(data.data.postCount);
      }
      if (data.data?.preview !== undefined) {
        setFirst20Lines(data.data.preview);
      }
    } catch (err) {
      console.error('Error caught:', err);
      setError(err instanceof Error ? err.message : "Failed to run migration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Prepare Migration</h2>
      <p className="mb-4">Run the migration preparation script and generate the migration data.</p>
      <button
        onClick={runPrepareMigration}
        disabled={loading}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition mb-4"
      >
        {loading ? "Running..." : "Run Prepare Migration"}
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
                  const errorData = JSON.parse(error);
                  return (
                    <>
                      <p className="text-red-200">{errorData.message}</p>
                      {errorData.details && (
                        <div className="mt-4">
                          {errorData.details.guidance && (
                            <div className="mb-4">
                              <h3 className="text-lg font-semibold text-red-300 mb-2">Troubleshooting Steps:</h3>
                              <div className="bg-gray-900/50 p-4 rounded text-sm text-gray-300">
                                {errorData.details.guidance.split('\n').map((line: string, index: number) => (
                                  <p key={index} className="mb-2">{line}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          <h3 className="text-lg font-semibold text-red-300 mb-2">Technical Details:</h3>
                          <pre className="bg-gray-900/50 p-4 rounded text-sm text-gray-300 overflow-auto">
                            {JSON.stringify(errorData.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </>
                  );
                } catch (e) {
                  console.error('Error parsing error message:', e);
                  return <p className="text-red-200">{error}</p>;
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceholderStep() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Next Step (Placeholder)</h2>
      <p>This is a placeholder for the next step of your migration process.</p>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      {step === null ? (
        <div>
          <h1 className="text-3xl font-bold mb-8">Migration Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="rounded-lg border border-gray-700 bg-gray-800 shadow p-6 flex flex-col items-start hover:bg-gray-700 transition cursor-pointer text-left"
              >
                <h2 className="text-xl font-semibold mb-2">{s.title}</h2>
                <p className="text-gray-300">{s.description}</p>
              </button>
            ))}
          </div>
        </div>
      ) : step === 0 ? (
        <>
          <button className="mb-4 text-blue-400 underline" onClick={() => setStep(null)}>&larr; Back to Dashboard</button>
          <PrepareMigrationUI />
        </>
      ) : step === 1 ? (
        <>
          <button className="mb-4 text-blue-400 underline" onClick={() => setStep(null)}>&larr; Back to Dashboard</button>
          <VerifyMigrationUI />
        </>
      ) : (
        <>
          <button className="mb-4 text-blue-400 underline" onClick={() => setStep(null)}>&larr; Back to Dashboard</button>
          <PlaceholderStep />
        </>
      )}
    </div>
  );
}
