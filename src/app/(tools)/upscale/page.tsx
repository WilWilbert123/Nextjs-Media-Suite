"use client";

import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";

export default function UpscalePage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [scale, setScale] = React.useState<number>(2);
  const { isReady, isProcessing, progress, error, convertVideo, resultUrl, reset } = useMediaEngine();

  const handleProcess = () => {
    if (!file) return;
    const filter = `scale=iw*${scale}:ih*${scale}:flags=lanczos,unsharp=5:5:1.0:5:5:0.0`;
    convertVideo(file, [filter], file.name.split('.').pop()?.toLowerCase() || 'mp4');
  };

  const handleReset = () => {
    reset();
    setFile(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          AI Image & Video Upscaler
        </h1>
        <p className="text-muted-foreground">
          Super-resolution enhancement and noise reduction using Lanczos resampling and unsharp masking.
        </p>
      </div>

      {!isReady && (
        <div className="p-8 border border-border rounded-xl bg-card flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing WebAssembly Engine...</p>
        </div>
      )}

      {isReady && !file && (
        <FileUploader
          onFileSelect={(f) => setFile(f as File)}
          accept="video/*,image/*"
        />
      )}

      {file && !resultUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              disabled={isProcessing}
            >
              Choose different file
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex flex-col gap-4">
              <label className="text-sm font-medium">Upscale Factor</label>
              <select 
                value={scale} 
                onChange={e => setScale(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                disabled={isProcessing}
              >
                <option value={2}>2x Upscale (High Quality)</option>
                <option value={3}>3x Upscale</option>
                <option value={4}>4x Upscale (Slower)</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-4 justify-center w-full md:w-64 mt-auto">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enhancing... {Math.round(progress * 100)}%</>
                ) : "Start Upscale"}
              </button>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </div>
          </div>
        </div>
      )}

      {resultUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="w-full bg-black/5 rounded-lg flex items-center justify-center min-h-[200px] p-4">
            {file?.type.includes("video") ? (
              <video src={resultUrl} controls autoPlay loop className="max-w-full max-h-[45vh] object-contain rounded-lg shadow-lg" />
            ) : (
              <img src={resultUrl} alt="Upscaled result" className="max-w-full max-h-[45vh] object-contain rounded-lg shadow-lg" />
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`gifter_upscaled_${Date.now()}.${file?.name.split('.').pop()}`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
            >
              Download Enhanced Media
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-secondary/50 active:scale-95 transition-all"
            >
              Enhance Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
