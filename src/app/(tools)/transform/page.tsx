"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, RefreshCw, Move, Loader2, RotateCw } from "lucide-react";

export default function TransformToolPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  
  // Transform State
  const [scalePercent, setScalePercent] = React.useState<number>(100);
  const [rotation, setRotation] = React.useState<number>(0);
  
  const { isReady, isProcessing, progress, error, convertVideo } = useMediaEngine();

  const handleProcess = async () => {
    if (!file) return;
    
    const filters: string[] = [];
    
    // Scale filter
    if (scalePercent !== 100) {
      const scaleStr = (scalePercent / 100).toFixed(2);
      filters.push(`scale=iw*${scaleStr}:ih*${scaleStr}`);
    }
    
    // Rotation filter
    if (rotation === 90) filters.push("transpose=1");
    else if (rotation === 180) filters.push("hflip,vflip");
    else if (rotation === 270) filters.push("transpose=2");

    // Default fast filter if nothing changed
    if (filters.length === 0) {
      filters.push("copy"); // Actually, if we just copy, we don't use -vf
    }
    
    const isGif = file.type.includes("gif") || file.name.toLowerCase().endsWith(".gif");
    const outputExt = isGif ? ".gif" : ".mp4";
    
    let args: string[] = [];
    if (filters.length > 0 && filters[0] !== "copy") {
      args = ["-vf", filters.join(",")];
      if (!isGif) {
        // Fast start for mp4
        args.push("-movflags", "faststart", "-pix_fmt", "yuv420p");
      }
    } else {
      args = ["-c", "copy"];
    }

    const url = await convertVideo(file, args, outputExt);
    if (url) {
      setResultUrl(url);
    }
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setFile(null);
    setScalePercent(100);
    setRotation(0);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Move className="w-8 h-8 text-primary" />
          Transform Media
        </h1>
        <p className="text-muted-foreground">
          Resize and rotate your GIFs or Videos completely offline.
        </p>
      </div>

      {!isReady && (
        <div className="p-8 border border-border rounded-xl bg-card flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing WebAssembly Media Engine...</p>
        </div>
      )}

      {isReady && !file && (
        <FileUploader
          onFileSelect={(f) => setFile(f as File)}
          accept="video/mp4,video/webm,image/gif"
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

          {!isProcessing ? (
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 flex flex-col gap-8">
              {/* Scale Control */}
              <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Resize (Scale)</label>
                  <span className="text-sm font-bold text-primary">{scalePercent}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="200" 
                  step="10"
                  value={scalePercent} 
                  onChange={(e) => setScalePercent(parseInt(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Adjust the video or GIF dimensions (100% is original size).</p>
              </div>

              {/* Rotation Control */}
              <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                <label className="text-sm font-medium">Rotate</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      onClick={() => setRotation(deg)}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        rotation === deg 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <RotateCw className="w-5 h-5" style={{ transform: `rotate(${deg}deg)` }} />
                      <span className="text-xs font-medium">{deg}°</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleProcess}
                className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all w-full mt-auto"
              >
                Apply & Encode Transformations
              </button>
            </div>

            {/* Live Preview Window */}
            <div className="flex-1 border-2 border-dashed border-border rounded-xl p-2 bg-muted/20 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-10 backdrop-blur-md">
                Live Preview
              </div>
              <div 
                className="transition-transform duration-300"
                style={{ 
                  transform: `scale(${scalePercent / 100}) rotate(${rotation}deg)`,
                }}
              >
                {file.type.includes("video") ? (
                  <video 
                    src={URL.createObjectURL(file)} 
                    autoPlay 
                    loop 
                    muted
                    className="max-w-full max-h-[300px] object-contain rounded-lg shadow-lg"
                  />
                ) : (
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt="Preview" 
                    className="max-w-full max-h-[300px] object-contain rounded-lg shadow-lg"
                  />
                )}
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
              <p className="text-sm font-medium animate-pulse">Transforming media locally...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-lg text-sm font-medium break-all">
              {error}
            </div>
          )}
        </div>
      )}

      {resultUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="w-full bg-black/5 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px] p-4">
            {resultUrl.endsWith(".mp4") ? (
              <video src={resultUrl} controls autoPlay loop className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg" />
            ) : (
              <img src={resultUrl} alt="Transformed output" className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg" />
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`gifter_transformed_${Date.now()}${file?.name.endsWith('.gif') ? '.gif' : '.mp4'}`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
            >
              <Download className="w-5 h-5" />
              Download Result
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex items-center justify-center gap-2 p-4 rounded-lg border border-border hover:bg-muted font-medium transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Transform Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
