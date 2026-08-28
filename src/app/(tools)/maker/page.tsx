"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, RefreshCw, Film, Loader2 } from "lucide-react";

export default function MakerPage() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [fps, setFps] = React.useState(10);
  
  const { isReady, isProcessing, progress, error, convertImagesToGif } = useMediaEngine();

  const handleProcess = async () => {
    if (files.length === 0) return;
    
    const url = await convertImagesToGif(files, fps);
    if (url) {
      setResultUrl(url);
    }
  };

  const handleReset = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setResultUrl(null);
    setFiles([]);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Film className="w-8 h-8 text-primary" />
          GIF Maker
        </h1>
        <p className="text-muted-foreground">
          Upload multiple images to stitch them together into a high-quality animated GIF or WebP.
        </p>
      </div>

      {!isReady && (
        <div className="p-8 border border-border rounded-xl bg-card flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing WebAssembly Media Engine...</p>
        </div>
      )}

      {isReady && files.length === 0 && (
        <FileUploader
          onFileSelect={(f) => setFiles(Array.isArray(f) ? f : [f])}
          accept="image/png,image/jpeg,image/webp"
          multiple
        />
      )}

      {files.length > 0 && !resultUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{files.length} images selected</p>
              <p className="text-sm text-muted-foreground">
                {(files.reduce((acc, curr) => acc + curr.size, 0) / 1024 / 1024).toFixed(2)} MB total
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              disabled={isProcessing}
            >
              Start over
            </button>
          </div>

          {!isProcessing ? (
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 flex flex-col gap-8">
                <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="text-sm font-medium">Frames Per Second (FPS): {fps}</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="30" 
                    value={fps} 
                    onChange={(e) => setFps(parseInt(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleProcess}
                  className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all w-full mt-auto"
                >
                  Generate GIF
                </button>
              </div>

              {/* Live Preview Grid Window */}
              <div className="flex-1 border-2 border-dashed border-border rounded-xl p-4 bg-muted/20 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-10 backdrop-blur-md">
                  Frame Preview ({files.length})
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 w-full max-h-[400px] overflow-y-auto pr-2">
                  {files.map((file, i) => (
                    <div key={i} className="aspect-square bg-background rounded border border-border overflow-hidden relative">
                      <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Frame ${i+1}`} />
                      <span className="absolute bottom-1 right-1 text-[10px] font-bold bg-black/50 text-white px-1 rounded">{i+1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-16 h-16 relative flex items-center justify-center">
                <svg className="animate-spin w-full h-full text-primary" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="absolute text-xs font-bold">{Math.round(progress * 100)}%</span>
              </div>
              <p className="text-sm font-medium animate-pulse">Stitching frames locally...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-lg text-sm font-medium">
              Error: {error}
            </div>
          )}
        </div>
      )}

      {resultUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="w-full bg-black/5 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
            <img src={resultUrl} alt="Generated GIF output" className="max-w-full max-h-[600px] object-contain" />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`gifter_output_${Date.now()}.gif`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
            >
              <Download className="w-5 h-5" />
              Download GIF
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex items-center justify-center gap-2 p-4 rounded-lg border border-border hover:bg-muted font-medium transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
