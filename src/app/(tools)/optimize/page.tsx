"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, RefreshCw, Loader2, Gauge, Zap } from "lucide-react";
import gifsicle from "gifsicle-wasm-browser";

export default function OptimizeToolPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [resultSize, setResultSize] = React.useState<number | null>(null);
  
  // Compression State
  const [quality, setQuality] = React.useState<number>(50); // 1-100 (100 = best quality, 1 = worst quality / highest compression)
  
  const { isReady, isProcessing, progress, error, convertVideo } = useMediaEngine();
  const [isGifsicleProcessing, setIsGifsicleProcessing] = React.useState(false);
  const [gifsicleError, setGifsicleError] = React.useState<string | null>(null);

  const handleProcess = async () => {
    if (!file) return;
    
    const isGif = file.type.includes("gif") || file.name.toLowerCase().endsWith(".gif");
    
    if (isGif) {
      // Use Gifsicle for GIF optimization (much better lossy compression than FFmpeg)
      setIsGifsicleProcessing(true);
      setGifsicleError(null);
      try {
        // Map 1-100 quality to 200-10 lossy value
        // Gifsicle lossy: 20 is light compression, 200 is heavy noise
        const lossyValue = Math.floor(200 - (quality / 100) * 190); 
        
        const outFiles = await gifsicle.run({
          input: [{
            file: file,
            name: "input.gif",
          }],
          command: [`-O3 --lossy=${lossyValue} input.gif -o /out/out.gif`],
        });
        
        if (outFiles && outFiles.length > 0) {
          const outBlob = new Blob([outFiles[0]], { type: "image/gif" });
          setResultSize(outBlob.size);
          setResultUrl(URL.createObjectURL(outBlob));
        } else {
          throw new Error("Gifsicle failed to generate output");
        }
      } catch (err: any) {
        setGifsicleError(err.message || "Gifsicle compression failed");
      } finally {
        setIsGifsicleProcessing(false);
      }
    } else {
      // Use FFmpeg for MP4 optimization
      // Map 1-100 quality to CRF 51-18 (51 = worst, 18 = nearly visually lossless)
      const crfValue = Math.floor(51 - (quality / 100) * 33);
      
      const args = [
        "-vcodec", "libx264", 
        "-crf", crfValue.toString(), 
        "-preset", "veryfast",
        "-movflags", "faststart"
      ];
      
      const url = await convertVideo(file, args, ".mp4");
      if (url) {
        setResultUrl(url);
        // Estimate size by fetching the blob (convertVideo returns blob URL)
        const res = await fetch(url);
        const blob = await res.blob();
        setResultSize(blob.size);
      }
    }
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setResultSize(null);
    setFile(null);
    setQuality(50);
  };

  const activeProcessing = isProcessing || isGifsicleProcessing;
  const activeError = error || gifsicleError;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Zap className="w-8 h-8 text-primary" />
          Optimize Media
        </h1>
        <p className="text-muted-foreground">
          Drastically reduce GIF and MP4 file sizes without losing too much quality.
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
              disabled={activeProcessing}
            >
              Choose different file
            </button>
          </div>

          {!activeProcessing ? (
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 flex flex-col gap-8">
              {/* Compression Control */}
              <div className="flex flex-col gap-4 bg-muted/30 p-6 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <label className="font-medium flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-primary" />
                    Quality Level
                  </label>
                  <span className="text-lg font-bold text-primary">{quality}%</span>
                </div>
                
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  step="1"
                  value={quality} 
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Smallest File (Low Quality)</span>
                  <span>Balanced</span>
                  <span>Highest Quality (Large File)</span>
                </div>
              </div>

              <button
                onClick={handleProcess}
                className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all w-full mt-auto"
              >
                Compress File
              </button>
            </div>

            {/* Live Preview Window */}
            <div className="flex-1 border-2 border-dashed border-border rounded-xl p-2 bg-muted/20 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-10 backdrop-blur-md">
                Original Preview
              </div>
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
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-16 h-16 relative flex items-center justify-center">
                <svg className="animate-spin w-full h-full text-primary" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isProcessing && <span className="absolute text-xs font-bold">{Math.round(progress * 100)}%</span>}
              </div>
              <p className="text-sm font-medium animate-pulse">
                {isGifsicleProcessing ? "Running Lossy GIF Compression..." : "Encoding MP4..."}
              </p>
            </div>
          )}

          {activeError && (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-lg text-sm font-medium break-all">
              {activeError}
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
              <img src={resultUrl} alt="Optimized output" className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg" />
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Original Size</span>
              <span className="text-lg font-medium">{(file!.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Optimized Size</span>
              <span className="text-lg font-bold text-emerald-500">
                {resultSize ? (resultSize / 1024 / 1024).toFixed(2) : "..."} MB
              </span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`gifter_optimized_${Date.now()}${file?.name.endsWith('.gif') ? '.gif' : '.mp4'}`}
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
              Optimize Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
