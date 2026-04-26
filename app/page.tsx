"use client";

import React, { useState, useEffect, useRef } from 'react';
import { get, set, del } from 'idb-keyval';
import { UploadScreen } from '../components/UploadScreen';
import { CSVEditor } from '../components/CSVEditor';

const DB_KEY = 'tablet-csv-data';

export default function App() {
  const [data, setData] = useState<string[][] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load from IndexedDB on mount
    get<string[][]>(DB_KEY).then((storedData) => {
      if (storedData && storedData.length > 0) {
        setData(storedData);
      }
      setIsLoading(false);
    }).catch((err) => {
      console.error("Error loading data from IndexedDB", err);
      setIsLoading(false);
    });
  }, []);

  const handleDataLoaded = (newData: string[][]) => {
    setData(newData);
    set(DB_KEY, newData).catch(console.error);
  };

  const handlePersistData = (newData: string[][]) => {
    // Debounce saving to IndexedDB to avoid blocking the main thread during rapid typing
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
        set(DB_KEY, newData).catch(console.error);
    }, 800);
  };

  const handleGoBack = () => {
    setData(null);
    del(DB_KEY);
  };

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  if (!data) {
    return <UploadScreen onLoadData={handleDataLoaded} />;
  }

  return <CSVEditor initialData={data} onGoBack={handleGoBack} onSaveData={handlePersistData} />;
}
