import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronRight, ChevronLeft, Download, Trash2, Plus, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import Papa from 'papaparse';

interface CSVEditorProps {
  initialData: string[][];
  onGoBack: () => void;
  onSaveData: (data: string[][]) => void;
}

export function CSVEditor({ initialData, onGoBack, onSaveData }: CSVEditorProps) {
  const [data, setData] = useState<string[][]>(initialData);
  // viewStartCol tracks the primary column visible (0-indexed). 
  // We'll show viewStartCol, viewStartCol+1, viewStartCol+2
  const [viewStartCol, setViewStartCol] = useState(0);
  
  // Focused cell: [rowIndex, colIndex] or null
  const [focusedCell, setFocusedCell] = useState<{ r: number; c: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const numCols = data[0]?.length || 0;
  const numRows = data.length;

  // The 3 columns we're currently showing
  const visibleCols = useMemo(() => {
    const cols = [];
    for (let i = 0; i < 3; i++) {
      if (viewStartCol + i < numCols) {
        cols.push(viewStartCol + i);
      }
    }
    return cols;
  }, [viewStartCol, numCols]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      setViewStartCol((prev) => Math.min(prev + 1, numCols - 1));
    },
    onSwipeRight: () => {
      setViewStartCol((prev) => Math.max(prev - 1, 0));
    },
  });

  const handleCellChange = useCallback((r: number, c: number, value: string) => {
    setData((prev) => {
      const next = [...prev];
      // Clone row
      next[r] = [...prev[r]];
      next[r][c] = value;
      // Schedule save (debounce if needed, or immediate since we save on Enter anyway per spec, 
      // but live input update is good for usability to prevent data loss).
      onSaveData(next);
      return next;
    });
  }, [onSaveData]);

  // Virtualizer for the body rows (skipping row 0 which is header)
  const virtualizer = useVirtualizer({
    count: numRows - 1,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 56, // 56px row height for touch targets
    overscan: 10, // Render 10 items offscreen for smooth scroll
  });

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      let nextRow = r + 1;
      
      // If we are at the last row, add a new row!
      if (nextRow >= numRows) {
        setData(prev => {
           const newRow = new Array(numCols).fill('');
           const nextData = [...prev, newRow];
           onSaveData(nextData);
           return nextData;
        });
      }
      
      setFocusedCell({ r: nextRow, c });
      
      // Auto-scroll to the new cell if it's potentially offscreen
      // We subtract 1 because virtualizer indexes from 0 but our data row index is r+1, 
      // where row 1 is virtual index 0.
      virtualizer.scrollToIndex(nextRow - 1, { align: 'auto' });
    }
  }, [numRows, numCols, onSaveData, virtualizer]);

  const handleDownload = () => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const shiftView = (dir: 1 | -1) => {
    setViewStartCol(prev => {
        let next = prev + dir;
        next = Math.max(0, Math.min(next, numCols - 1));
        return next;
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-3 sm:px-6 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">CSV Editor</h1>
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {numRows - 1} rows
            </span>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => {
                  const wantsDownload = confirm("Do you want to download your CSV before going back?");
                  if (wantsDownload) {
                    handleDownload();
                  }
                  onGoBack();
                }}
                className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-lg bg-slate-100 text-slate-700 sm:font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
                title="Go Back"
            >
                <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Go Back</span>
            </button>
            <button 
                onClick={handleDownload}
                className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-lg bg-blue-600 text-white sm:font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                title="Download CSV"
            >
                <Download className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Download</span>
            </button>
        </div>
      </div>

      {/* Swipe Nav Indicator Bar */}
      <div className="flex items-center justify-between p-2 bg-white border-b border-slate-200 shrink-0">
         <button 
            onClick={() => shiftView(-1)}
            disabled={viewStartCol === 0}
            className="p-3 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 touch-manipulation"
         >
            <ChevronLeft className="w-6 h-6" />
         </button>
         
         <div className="flex-1 flex justify-center gap-2 overflow-hidden">
            {data[0].map((header, idx) => (
                <div 
                    key={idx} 
                    className={clsx(
                        "h-1.5 rounded-full transition-all duration-300",
                        visibleCols.includes(idx) ? "bg-blue-500 flex-grow max-w-[2rem]" : "bg-slate-200 w-2"
                    )}
                />
            ))}
         </div>

         <button 
            onClick={() => shiftView(1)}
            disabled={viewStartCol >= numCols - 1}
            className="p-3 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 touch-manipulation"
         >
             <ChevronRight className="w-6 h-6" />
         </button>
      </div>

      {/* Table Container (The scrollable area) */}
      <div 
        {...swipeHandlers}
        ref={containerRef}
        className="flex-1 overflow-y-auto overscroll-y-contain relative bg-white"
        style={{
             // Prevent horizontal scroll from messing with swipe
            touchAction: 'pan-y'
        }}
      >
        <div style={{ height: `${virtualizer.getTotalSize() + 56}px`, width: '100%', position: 'relative' }}>
          
          {/* Header Row (Sticky equivalent) */}
          <div className="absolute top-0 left-0 right-0 flex border-b border-slate-300 bg-slate-50 z-10" style={{ height: '56px' }}>
             <div className="w-12 shrink-0 border-r border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-400 bg-slate-100">
             </div>
             {visibleCols.map(colIndex => (
                 <div key={`head-${colIndex}`} className="flex-1 border-r border-slate-200 px-4 py-3 flex items-center min-w-0">
                    <span className="font-semibold text-sm text-slate-700 truncate select-none">
                        {data[0][colIndex] || `Col ${colIndex + 1}`}
                    </span>
                 </div>
             ))}
          </div>

          {/* Virtual Body Rows */}
          {virtualizer.getVirtualItems().map((virtualRow) => {
              // virtualRow.index is 0-based body row. Actual data row is index + 1
              const rowIndex = virtualRow.index + 1;
              const rowData = data[rowIndex];
              
              if (!rowData) return null;

              return (
                  <div
                    key={virtualRow.key}
                    className="absolute top-0 left-0 right-0 flex border-b border-slate-100 bg-white"
                    style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start + 56}px)` // offset by header height
                    }}
                  >
                      {/* Row Number Sidebar */}
                      <div className="w-12 shrink-0 border-r border-slate-200 flex items-center justify-center text-xs font-medium text-slate-400 bg-slate-50 select-none">
                          {rowIndex}
                      </div>

                      {/* Visible Cells */}
                      {visibleCols.map(colIndex => {
                          const isFocused = focusedCell?.r === rowIndex && focusedCell?.c === colIndex;
                          const cellValue = rowData[colIndex] || '';

                          return (
                              <CellInput
                                key={`${rowIndex}-${colIndex}`}
                                value={cellValue}
                                isFocused={isFocused}
                                onChange={(val) => handleCellChange(rowIndex, colIndex, val)}
                                onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                                onFocus={() => setFocusedCell({ r: rowIndex, c: colIndex })}
                              />
                          );
                      })}
                  </div>
              );
          })}
        </div>
      </div>
    </div>
  );
}

interface CellInputProps {
  value: string;
  isFocused: boolean;
  onChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
}

const CellInput = React.memo(function CellInput({
  value,
  isFocused,
  onChange,
  onKeyDown,
  onFocus,
}: CellInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // When focused state changes (e.g. from Keyboard navigation like Enter), 
  // programmatically focus it if it doesn't already have focus.
  useEffect(() => {
    if (isFocused && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  return (
    <div className={clsx(
        "flex-1 border-r border-slate-200 relative min-w-0 transition-colors bg-white",
        isFocused ? "z-10 shadow-[inset_0_0_0_2px_rgba(59,130,246,1)]" : "hover:bg-slate-50"
    )}>
      <input
        ref={inputRef}
        type="text"
        className="absolute inset-0 w-full h-full bg-transparent px-4 py-0 text-base outline-none cursor-text truncate z-20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
      />
    </div>
  );
});

// Simple custom hook for left/right swiping
function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }: { onSwipeLeft: () => void, onSwipeRight: () => void, threshold?: number }) {
  const touchStart = useRef<{x: number, y: number} | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
      touchStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
      };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
      if (!touchStart.current) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchStart.current.x - touchEndX;
      const deltaY = Math.abs(touchStart.current.y - touchEndY);
      
      // Require swipe to be mostly horizontal
      if (deltaY < Math.abs(deltaX) * 0.5) {
          if (deltaX > threshold) {
              onSwipeLeft();
          } else if (deltaX < -threshold) {
              onSwipeRight();
          }
      }
      
      touchStart.current = null;
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchEnd };
}
