'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { createClient } from '@/lib/supabase/client';
import { Upload, Check, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';

const STUDENT_SCHEMA = [
  'full_name',
  'admission_number',
  'roll_number',
  'father_name',
  'mother_name',
  'date_of_birth',
  'address',
  'phone'
];

export default function DataImporter() {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [isMapping, setIsMapping] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setHeaders(Object.keys(results.data[0] || {}));
        autoMapColumns(Object.keys(results.data[0] || {}));
      },
    });
  };

  const autoMapColumns = async (csvHeaders: string[]) => {
    setIsMapping(true);
    try {
      const res = await fetch('/api/ai/map-columns', {
        method: 'POST',
        body: JSON.stringify({
          headers: csvHeaders,
          targetSchema: STUDENT_SCHEMA,
        }),
      });
      const data = await res.json();
      setMapping(data);
    } catch (error) {
      console.error('Mapping failed:', error);
    } finally {
      setIsMapping(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    let success = 0;
    let failed = 0;

    // Get current school_id (in a real app, this would come from context/session)
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user?.id).single();
    
    if (!profile?.school_id) {
      alert("School ID not found");
      setIsImporting(false);
      return;
    }

    for (const row of csvData) {
      const studentData: any = {
        school_id: profile.school_id,
      };

      // Map CSV row to schema
      Object.entries(mapping).forEach(([schemaKey, csvHeader]) => {
        if (csvHeader) {
          studentData[schemaKey] = row[csvHeader];
        }
      });

      // In a real scenario, we'd handle profile creation first if needed
      // For now, we insert into students table directly
      const { error } = await supabase.from('students').insert([studentData]);
      
      if (error) {
        console.error('Import error:', error);
        failed++;
      } else {
        success++;
      }
    }

    setImportResult({ success, failed });
    setIsImporting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-green-600" />
            AI Data Importer
          </h1>
          <p className="text-gray-600">Upload messy student records and let AI map them to our system.</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          {!file ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <label className="cursor-pointer">
                <span className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  Choose CSV File
                </span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
              <p className="mt-4 text-sm text-gray-500">Only .csv files supported for now</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-sm text-gray-500">({csvData.length} rows detected)</span>
                </div>
                <button onClick={() => setFile(null)} className="text-sm text-red-600 hover:underline">
                  Remove
                </button>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  Column Mapping
                  {isMapping && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {STUDENT_SCHEMA.map((field) => (
                    <div key={field} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {field.replace(/_/g, ' ')}
                      </span>
                      <select
                        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        value={mapping[field] || ''}
                        onChange={(e) => setMapping({ ...mapping, [field]: e.target.value || null })}
                      >
                        <option value="">Skip Field</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t">
                <button
                  onClick={handleImport}
                  disabled={isImporting || isMapping}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Importing Records...
                    </>
                  ) : (
                    'Confirm & Import Data'
                  )}
                </button>
              </div>
            </div>
          )}

          {importResult && (
            <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${importResult.failed === 0 ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
              {importResult.failed === 0 ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <div>
                <p className="font-bold">Import Complete</p>
                <p className="text-sm">Successfully imported {importResult.success} students. {importResult.failed} failed.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
