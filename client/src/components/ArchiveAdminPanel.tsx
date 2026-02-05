import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';


interface ArchiveAdminPanelProps {
  year: number;
}

type AdminTab = 'archive' | 'roster';

export default function ArchiveAdminPanel({ year }: ArchiveAdminPanelProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<AdminTab>('archive');
  const [selectedYear, setSelectedYear] = useState<number>(year);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
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
      setFile(null); // Reset
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setLogs(prev => [...prev, `❌ Error: ${msg}`]);
    } finally {
      setUploading(false);
    }
  };

  const handleSyncSeason = async () => {
    setUploading(true);
    setError(null);
    setLogs([`Starting full sync for ${selectedYear} (Auto-match + Stats)...`]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/archive/${selectedYear}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setLogs(prev => [...prev, ...(data.logs || []), '✅ Season Sync Complete!']);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setLogs(prev => [...prev, `❌ Error: ${msg}`]);
    } finally {
      setUploading(false);
    }
  };

  const handleAutoMatch = async (all: boolean) => {
    setUploading(true);
    setError(null);
    setLogs([`Starting auto-match for ${all ? 'all seasons' : selectedYear}...`]);

    try {
      const token = localStorage.getItem('token');
      const url = all ? '/api/archive/auto-match-all' : `/api/archive/${selectedYear}/auto-match`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Auto-match failed');
      }

      if (all) {
        const results = data.results.map((r: { year: number; matched: number; unmatched: number }) => `Year [${r.year}]: Matched ${r.matched}, Unmatched ${r.unmatched}`);
        setLogs(prev => [...prev, ...results, '✅ Global Auto-Match Complete!']);
      } else {
        setLogs(prev => [...prev, `Matched ${data.matched} players, ${data.unmatched} unmatched.`, '✅ Season Auto-Match Complete!']);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setLogs(prev => [...prev, `❌ Error: ${msg}`]);
    } finally {
      setUploading(false);
    }
  };

  const handleArchiveSeason = async () => {
    if (!window.confirm("Are you sure you want to archive the current live season? This will overwrite any existing archive for that year.")) {
      return;
    }

    setUploading(true);
    setError(null);
    setLogs([`Starting live season archival...`]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/archive/archive-current`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Archiving failed');
      }

      setLogs(prev => [...prev, ...(data.logs || []), '✅ Archiving Complete!']);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setLogs(prev => [...prev, `❌ Error: ${msg}`]);
    } finally {
      setUploading(false);
    }
  };

  const handleRecalculateAll = async () => {
    if (!window.confirm("Are you sure you want to recalculate stats and teams for ALL historical seasons? This will take several minutes.")) {
      return;
    }

    setUploading(true);
    setError(null);
    setLogs([`Starting global recalculation for all seasons...`]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/archive/recalculate-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Global recalculation failed');
      }

      setLogs(prev => [...prev, `Updated ${data.totalUpdated} player records across all seasons.`, '✅ Global Recalculation Complete!']);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setLogs(prev => [...prev, `❌ Error: ${msg}`]);
    } finally {
      setUploading(false);
    }
  };

  const [showMaintenance, setShowMaintenance] = useState(false);

  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white shadow'}`}>
      {/* Tab Navigation */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('archive')}
          className={`px-4 py-2 font-medium ${activeTab === 'archive' 
            ? theme === 'dark' ? 'border-b-2 border-blue-500 text-blue-400' : 'border-b-2 border-blue-500 text-blue-600'
            : theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Archive Administration
        </button>
      </div>

      {/* Archive Import Tab */}
      {activeTab === 'archive' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold">Season Management</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Target Year:</label>
                <input 
                  type="number" 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className={`w-24 px-2 py-1 rounded border ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'}`}
                />
              </div>
            </div>
          </div>
      
      <div className="mb-6">
        <p className={`mb-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
          Select a year above to manage its data. You can import new data from Excel or sync existing records with MLB stats.
        </p>
      </div>

      {/* Admin Actions Table */}
      <div className="mb-6 overflow-x-auto">
        <table className={`w-full text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
          <thead>
            <tr className={theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}>
              <th className="px-4 py-2 text-left font-medium">Action</th>
              <th className="px-4 py-2 text-left font-medium">Description</th>
              <th className="px-4 py-2 text-center font-medium w-40">Run</th>
            </tr>
          </thead>
          <tbody className={theme === 'dark' ? 'divide-y divide-slate-600' : 'divide-y divide-gray-200'}>
            <tr>
              <td className="px-4 py-3 font-medium">Import Excel</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-2">
                  <span>Upload .xlsx to overwrite draft/standings/periods.</span>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileChange}
                    className="text-xs"
                  />
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <button onClick={handleUpload} disabled={!file || uploading} className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${!file || uploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : theme === 'dark' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  {uploading ? '...' : 'Import'}
                </button>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium">Sync MLB Data</td>
              <td className="px-4 py-3">Matches players to MLB IDs and fetches latest stats/teams for the entire {selectedYear} season.</td>
              <td className="px-4 py-3 text-center">
                <button onClick={handleSyncSeason} disabled={uploading} className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${uploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-700 hover:bg-slate-800 text-white'}`}>
                  Run Sync
                </button>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium">Archive Live Season</td>
              <td className="px-4 py-3">Snapshot current season rosters/stats into the historical archive.</td>
              <td className="px-4 py-3 text-center">
                <button onClick={handleArchiveSeason} disabled={uploading} className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${uploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : theme === 'dark' ? 'bg-amber-700 hover:bg-amber-600 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}>
                  Archive
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Maintenance Section */}
      <div className={`mt-8 border-t pt-4 ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
        <button 
          onClick={() => setShowMaintenance(!showMaintenance)}
          className={`flex items-center gap-2 text-sm font-medium ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span>{showMaintenance ? '▼' : '▶'} Advanced Maintenance</span>
        </button>
        
        {showMaintenance && (
          <div className="mt-4 flex flex-wrap gap-4">
            <button onClick={() => handleAutoMatch(true)} disabled={uploading} className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${theme === 'dark' ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-gray-300 hover:bg-gray-50 text-gray-600'}`}>
              Global Auto-Match (All Years)
            </button>
            <button onClick={handleRecalculateAll} disabled={uploading} className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${theme === 'dark' ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-gray-300 hover:bg-gray-50 text-gray-600'}`}>
              Global Recalculate (All Years)
            </button>
          </div>
        )}
      </div>

      {/* Logs / Output */}
      {(logs.length > 0 || error) && (
        <div className={`mt-6 p-4 rounded text-sm font-mono max-h-60 overflow-y-auto ${
          theme === 'dark' ? 'bg-black/40 text-blue-300' : 'bg-gray-900 text-blue-200'
        }`}>
          <div className="flex justify-between items-center mb-2 border-b border-blue-900 pb-1">
            <span className="text-xs uppercase font-bold tracking-wider opacity-60">System Logs</span>
            <button onClick={() => setLogs([])} className="text-[10px] hover:text-white uppercase">Clear</button>
          </div>
          {logs.map((log, i) => (
            <div key={i} className="mb-0.5">{log}</div>
          ))}
          {error && <div className="text-red-400 mt-2 font-bold">{error}</div>}
        </div>
      )}
        </>
      )}


    </div>
  );
}
