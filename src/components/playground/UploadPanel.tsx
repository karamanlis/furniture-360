"use client";

import { useCallback, useRef, useState } from "react";

interface UploadPanelProps {
  onUpload: (dataUrl: string) => void;
  onUrlSubmit: (url: string) => void;
  previewUrl?: string;
}

export default function UploadPanel({ onUpload, onUrlSubmit, previewUrl }: UploadPanelProps) {
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [tab, setTab] = useState<"file" | "url">("file");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => onUpload(reader.result as string);
        reader.readAsDataURL(file);
      }
    },
    [onUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => onUpload(reader.result as string);
        reader.readAsDataURL(file);
      }
    },
    [onUpload]
  );

  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) onUrlSubmit(urlInput.trim());
  }, [urlInput, onUrlSubmit]);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setTab("file")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            tab === "file"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => setTab("url")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            tab === "url"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Image URL
        </button>
      </div>

      {tab === "file" ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-emerald-500 bg-emerald-500/5"
              : "border-zinc-700 hover:border-zinc-500"
          }`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Product preview"
              className="max-h-40 mx-auto rounded object-contain"
            />
          ) : (
            <div className="text-zinc-500">
              <div className="text-3xl mb-2">📷</div>
              <p className="text-sm">Drag & drop or click to upload</p>
              <p className="text-xs text-zinc-600 mt-1">JPG / PNG / WEBP</p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/product.jpg"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
            className="px-4 py-2 bg-zinc-700 text-zinc-100 rounded-lg text-sm font-medium hover:bg-zinc-600 disabled:opacity-50 transition-colors"
          >
            Set
          </button>
        </div>
      )}
    </div>
  );
}