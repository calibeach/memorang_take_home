"use client";

import { useCallback, useState } from "react";

interface PDFUploadProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

export function PDFUpload({ onUpload, isLoading }: PDFUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        setFileName(file.name);
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type === "application/pdf") {
        setFileName(file.name);
        onUpload(file);
      }
    },
    [onUpload]
  );

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-xl w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          Memorang Learning Agent
        </h1>
        <p className="text-gray-600 mb-8 text-center">
          Upload a PDF to start your personalized learning journey
        </p>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
            transition-all duration-200
            ${
              isDragging
                ? "border-primary-500 bg-primary-50"
                : "border-gray-300 hover:border-primary-400 hover:bg-gray-50"
            }
            ${isLoading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="pdf-upload"
            disabled={isLoading}
          />
          <label htmlFor="pdf-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-600">Processing...</span>
                </div>
              ) : fileName ? (
                <div className="text-gray-700">
                  <span className="font-medium">{fileName}</span>
                  <p className="text-sm text-gray-500 mt-1">
                    Click or drag to upload a different file
                  </p>
                </div>
              ) : (
                <>
                  <span className="text-gray-700 font-medium">
                    Drop your PDF here, or click to browse
                  </span>
                  <span className="text-sm text-gray-500">Supports PDF files up to 10MB</span>
                </>
              )}
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
