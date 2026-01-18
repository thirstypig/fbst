import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ArchiveAdminPanelProps {
  year: number;
}

export default function ArchiveAdminPanel({ year }: ArchiveAdminPanelProps) {
  const { theme } = useTheme();
  const [selectedYear, setSelectedYear] = useState<number>(year);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(false);
      setLogs([]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setLogs(['Starting upload...']);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token'); // Simplistic auth
      // In real app, use axios instance or fetch wrapper from api.ts
      // But for file upload, fetch is easy.
      
      const response = await fetch(`/api/archive/${selectedYear}/import-excel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setLogs(prev => [...prev, ...data.logs, '✅ Import Complete!']);
      setSuccess(true);
      setFile(null); // Reset
    } catch (err: any) {
      setError(err.message);
      setLogs(prev => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white shadow'}`}>
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-xl font-bold">Admin Archive Import Tool</h2>
        <div className="flex items-center gap-2">
           <label className="text-sm font-medium">Import Year:</label>
           <input 
             type="number" 
             value={selectedYear}
             onChange={(e) => setSelectedYear(parseInt(e.target.value))}
             className={`w-24 px-2 py-1 rounded border ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'}`}
           />
        </div>
      </div>
      
      <div className="mb-6">
        <p className={`mb-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
          Upload an Excel file (.xlsx or .xls) containing "Draft", "Standings", and period tabs.
          This will overwrite existing data for <strong>{selectedYear}</strong>.
        </p>
        
        <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
           theme === 'dark' ? 'border-slate-600 hover:border-slate-400' : 'border-gray-300 hover:border-gray-400'
        }`}>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileChange}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && (
            <div className="mt-4">
              <span className="font-medium">Selected: {file.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-start mb-6">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`px-4 py-2 rounded font-medium ${
            uploading || !file
              ? 'bg-gray-400 cursor-not-allowed text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {uploading ? 'Processing...' : 'Upload & Import'}
        </button>
      </div>

      {/* Logs / Output */}
      {(logs.length > 0 || error) && (
        <div className={`mt-4 p-4 rounded text-sm font-mono max-h-60 overflow-y-auto ${
          theme === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-gray-100 text-gray-800'
        }`}>
          {logs.map((log, i) => (
            <div key={i} className="mb-1">{log}</div>
          ))}
          {error && <div className="text-red-500 font-bold">{error}</div>}
        </div>
      )}
    </div>
  );
}
