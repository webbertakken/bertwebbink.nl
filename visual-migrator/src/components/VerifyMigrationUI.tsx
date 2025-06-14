"use client";

import React, { useEffect, useState } from 'react';
import { MigrationRecord } from '../types/migration';

export const VerifyMigrationUI: React.FC = () => {
  const [records, setRecords] = useState<MigrationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState<{ [key: number]: boolean }>({});
  const [openData, setOpenData] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    const loadMigrationData = async () => {
      try {
        const response = await fetch('/api/get-migration-data');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.details || `Failed to load migration data (Status: ${response.status})`);
        }

        if (!data.success) {
          throw new Error(data.error || data.details || 'Failed to load migration data');
        }

        setRecords(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load migration data');
        console.error('Error loading migration data:', err);
      }
    };

    loadMigrationData();
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Error Loading Migration Data</h1>
          <div className="space-y-4">
            <p className="text-red-200">{error}</p>
            {error.includes('details') && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold text-red-300 mb-2">Technical Details:</h2>
                <pre className="bg-gray-900/50 p-4 rounded text-sm text-gray-300 overflow-auto">
                  {JSON.stringify(JSON.parse(error.split('details:')[1]), null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-900 text-gray-100">
      <h1 className="text-3xl font-bold mb-8">Migration Verification UI</h1>
      {records.length === 0 ? (
        <p>Loading migration data...</p>
      ) : (
        records.map((record, index) => {
          const isDetailsOpen = openDetails[index] ?? false;
          const isDataOpen = openData[index] ?? false;
          return (
            <div
              key={index}
              className="mb-10 border border-gray-700 rounded-lg p-6 bg-gray-800 shadow"
            >
              <h2 className="text-xl font-semibold mb-4">
                Post: {record.transformed.title}
              </h2>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setOpenDetails((prev) => ({ ...prev, [index]: !isDetailsOpen }))}
                  className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  {isDetailsOpen ? 'Hide' : 'Show'} Details
                </button>
                <button
                  onClick={() => setOpenData((prev) => ({ ...prev, [index]: !isDataOpen }))}
                  className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition"
                >
                  {isDataOpen ? 'Hide' : 'Show'} Data
                </button>
              </div>
              {isDetailsOpen && (
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-1/3">
                    <h3 className="text-lg font-semibold mb-2">Original</h3>
                    <pre className="whitespace-pre-wrap break-words bg-gray-950 text-gray-100 p-3 rounded">
                      {typeof record.original === 'object' && record.original !== null && 'post_content' in record.original && typeof (record.original as { post_content: string }).post_content === 'string'
                        ? (record.original as { post_content: string }).post_content
                        : ''}
                    </pre>
                  </div>
                  <div className="w-full md:w-1/3">
                    <h3 className="text-lg font-semibold mb-2">Transformed</h3>
                    <pre className="whitespace-pre-wrap break-words bg-gray-950 text-gray-100 p-3 rounded">
                      {record.transformed.body}
                    </pre>
                  </div>
                  <div className="w-full md:w-1/3">
                    <h3 className="text-lg font-semibold mb-2">Transformed Body (Rendered HTML)</h3>
                    <div
                      className="bg-white text-gray-900 p-3 rounded shadow"
                      dangerouslySetInnerHTML={{ __html: record.transformed.body }}
                    />
                  </div>
                </div>
              )}
              {isDataOpen && (
                <div className="flex flex-col md:flex-row gap-6 mt-4">
                  <div className="w-full md:w-1/2">
                    <h4 className="text-md font-semibold mb-2">Original JSON</h4>
                    <pre className="whitespace-pre-wrap break-words bg-gray-950 text-gray-100 p-3 rounded">
                      {JSON.stringify(record.original, null, 2)}
                    </pre>
                  </div>
                  <div className="w-full md:w-1/2">
                    <h4 className="text-md font-semibold mb-2">Transformed JSON</h4>
                    <pre className="whitespace-pre-wrap break-words bg-gray-950 text-gray-100 p-3 rounded">
                      {JSON.stringify(record.transformed, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
