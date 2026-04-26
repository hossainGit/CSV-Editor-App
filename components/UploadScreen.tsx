import React, { useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface UploadScreenProps {
  onLoadData: (data: string[][]) => void;
}

export function UploadScreen({ onLoadData }: UploadScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        // results.data is an array of arrays when header: false (default)
        const parsedData = results.data as string[][];
        if (parsedData.length > 0) {
          // Normalize row lengths based on the header (first row)
          const headerLength = parsedData[0].length;
          const normalizedData = parsedData.map(row => {
            const newRow = [...row];
            while (newRow.length < headerLength) newRow.push('');
            return newRow.slice(0, headerLength);
          });
          onLoadData(normalizedData);
        }
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileSpreadsheet className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tablet CSV Editor</h1>
        <p className="text-gray-500 mb-8">
          Upload a CSV file to start editing in a fast, distraction-free environment optimized for touch.
        </p>

        <input
          type="file"
          accept=".csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors mb-4 focus:ring-4 focus:ring-blue-100 outline-none"
        >
          <Upload className="w-5 h-5" />
          Select CSV File
        </button>
      </div>
    </div>
  );
}
