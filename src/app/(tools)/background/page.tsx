"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { Download, Eraser, Loader2 } from "lucide-react";

export default function BackgroundEraserPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null);
  const [isComparing, setIsComparing] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (file) {
      setOriginalUrl(URL.createObjectURL(file));
    } else {
      setOriginalUrl(null);
    }
  }, [file]);

  const handleProcess = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setError(null);
    setProgress(0.1);

    try {
      // Dynamic import to avoid SSR issues with WASM/Web workers
      const { removeBackground } = await import("@imgly/background-removal");
      
      const imageBlob = await removeBackground(file, {
        progress: (key, current, total) => {
          // Approximate progress tracking
          setProgress((prev) => Math.min(prev + 0.1, 0.9));
        }
      });
      
      const url = URL.createObjectURL(imageBlob);
      setResultUrl(url);
      setProgress(1);
    } catch (err: any) {
      console.error(err);
      setError("Failed to remove background. Please try another image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResultUrl(null);
    setIsComparing(false);
    setProgress(0);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4 smooth-show">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-2 smooth-shadow">
          <Eraser className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Background Eraser</h1>
        <p className="text-muted-foreground max-w-lg">
          AI-powered local background removal. Your photos never leave your device, ensuring complete privacy.
        </p>
      </div>

      {!file && (
        <FileUploader 
          onFileSelect={(f) => setFile(f as File)} 
          accept="image/*"
          description="Supports JPG, PNG, WebP"
        />
      )}

      {file && (
        <div className="flex flex-col gap-4 w-full p-4 md:p-6 bg-card border border-border rounded-xl smooth-shadow">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-medium truncate max-w-[200px] md:max-w-md">{file.name}</span>
              <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            {!resultUrl && !isProcessing && (
              <button
                onClick={handleReset}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Change File
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          {resultUrl && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Preview</span>
                <button
                  onMouseDown={() => setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onMouseLeave={() => setIsComparing(false)}
                  onTouchStart={() => setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                  className="text-xs px-3 py-1 bg-secondary hover:bg-secondary/80 rounded-md font-medium transition-colors"
                >
                  Hold to Compare
                </button>
              </div>
              <div className="w-full aspect-video md:aspect-[21/9] rounded-lg overflow-hidden bg-secondary relative smooth-shadow flex items-center justify-center checkered-bg">
                <style>{`
                  .checkered-bg {
                    background-color: #f0f0f0;
                    background-image: 
                      linear-gradient(45deg, #e0e0e0 25%, transparent 25%), 
                      linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #e0e0e0 75%), 
                      linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
                    background-size: 20px 20px;
                    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                  }
                  .dark .checkered-bg {
                    background-color: #1a1a1a;
                    background-image: 
                      linear-gradient(45deg, #2a2a2a 25%, transparent 25%), 
                      linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #2a2a2a 75%), 
                      linear-gradient(-45deg, transparent 75%, #2a2a2a 75%);
                  }
                `}</style>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={isComparing && originalUrl ? originalUrl : resultUrl} 
                  alt="Result" 
                  className="max-w-full max-h-full object-contain drop-shadow-2xl transition-all duration-200" 
                />
              </div>
            </div>
          )}

          {!resultUrl ? (
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 w-full py-3 bg-foreground text-background rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting Subject... {Math.round(progress * 100)}%
                  </>
                ) : (
                  <>
                    <Eraser className="w-4 h-4" />
                    Remove Background
                  </>
                )}
              </button>
              
              {isProcessing && (
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-foreground transition-all duration-300"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <a
                href={resultUrl}
                download={`nobg_${file.name.replace(/\.[^/.]+$/, "")}.png`}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-foreground text-background rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </a>
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                Process Another
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
