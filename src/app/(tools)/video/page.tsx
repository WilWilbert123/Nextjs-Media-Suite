"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, RefreshCw, Film, Loader2 } from "lucide-react";

export default function VideoToolsPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [outputExt, setOutputExt] = React.useState<string | null>(null);
  const [trimStart, setTrimStart] = React.useState<number>(0);
  const [duration, setDuration] = React.useState<number>(5);
  const [isReversed, setIsReversed] = React.useState<boolean>(false);
  const [quality, setQuality] = React.useState<string>("original");
  const [speed, setSpeed] = React.useState<string>("1.0");
  
  const { isReady, isProcessing, progress, error, convertVideo } = useMediaEngine();

  const handleProcess = async (type: "gif" | "mp4") => {
    if (!file) return;
    
    let args: string[] = [];
    let ext = type === "gif" ? ".gif" : ".mp4";

    // Handle trimming
    if (trimStart > 0 || duration > 0) {
      args.push("-ss", trimStart.toString());
      args.push("-t", duration.toString());
    }

    const filters = [];
    const audioFilters: string[] = [];
    
    // Video speed
    if (speed !== "1.0") {
      const speedNum = parseFloat(speed);
      filters.push(`setpts=${1 / speedNum}*PTS`);
      
      if (type === "mp4") {
        if (speedNum === 4.0) {
          audioFilters.push("atempo=2.0,atempo=2.0");
        } else if (speedNum === 0.25) {
          audioFilters.push("atempo=0.5,atempo=0.5");
        } else {
          audioFilters.push(`atempo=${speedNum}`);
        }
      }
    }
    
    if (isReversed) {
      filters.push("reverse");
      if (type === "mp4") {
        audioFilters.push("areverse");
      }
    }

    if (type === "gif") {
      const w = quality === "original" ? "720" : quality;
      filters.push(`fps=15,scale=${w}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`);
      
      args.push("-filter_complex", filters.join(","));
    } else {
      // libx264 requires dimensions to be divisible by 2
      const scaleStr = quality === "original" 
        ? "scale=trunc(iw/2)*2:trunc(ih/2)*2"
        : `scale=${quality}:-2`;
        
      filters.push(scaleStr);
      args.push("-vf", filters.join(","));
      
      if (audioFilters.length > 0) {
        args.push("-af", audioFilters.join(","));
      }
      
      args.push("-preset", "ultrafast", "-movflags", "faststart", "-pix_fmt", "yuv420p");
    }

    const url = await convertVideo(file, args, ext);
    if (url) {
      setResultUrl(url);
      setOutputExt(ext);
    }
  };

  const handleReset = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setResultUrl(null);
    setOutputExt(null);
    setFile(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Film className="w-8 h-8 text-primary" />
          Video Converter
        </h1>
        <p className="text-muted-foreground">
          Convert MP4 to high-quality GIFs, or convert GIFs to optimized MP4s. Processed locally in your browser.
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
              <div className="grid grid-cols-2 gap-4">
                {/* Trim Start Control */}
                <div className="flex flex-col gap-2 bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="text-sm font-medium">Trim Start (sec)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={trimStart}
                    onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  />
                </div>

                {/* Duration Control */}
                <div className="flex flex-col gap-2 bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="text-sm font-medium">Duration (sec)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={duration}
                    onChange={(e) => setDuration(parseFloat(e.target.value) || 1)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  />
                </div>
              </div>

              {/* Reverse Control */}
              <label className="flex items-center gap-3 bg-muted/30 p-4 rounded-xl border border-border cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReversed}
                  onChange={(e) => setIsReversed(e.target.checked)}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
                <span className="font-medium">Reverse Video (Boomerang effect)</span>
              </label>

              <div className="grid grid-cols-2 gap-4">
                {/* Output Quality */}
                <div className="flex flex-col gap-2 bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="text-sm font-medium">Output Quality (Width)</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  >
                    <option value="original">Original</option>
                    <option value="1920">1080p (1920w)</option>
                    <option value="1280">720p (1280w)</option>
                    <option value="854">480p (854w)</option>
                    <option value="640">360p (640w)</option>
                    <option value="426">240p (426w)</option>
                  </select>
                </div>

                {/* Playback Speed */}
                <div className="flex flex-col gap-2 bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="text-sm font-medium">Playback Speed</label>
                  <select
                    value={speed}
                    onChange={(e) => setSpeed(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  >
                    <option value="0.25">0.25x (Slow)</option>
                    <option value="0.5">0.5x (Slow)</option>
                    <option value="1.0">1x (Normal)</option>
                    <option value="1.5">1.5x (Fast)</option>
                    <option value="2.0">2x (Fast)</option>
                    <option value="4.0">4x (Very Fast)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleProcess("gif")}
                  className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
                >
                  Convert to GIF
                </button>
                <button
                  onClick={() => handleProcess("mp4")}
                  className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-primary text-primary font-medium hover:bg-primary/10 active:scale-95 transition-all"
                >
                  Trim Video (MP4)
                </button>
              </div>
            </div>

            {/* Live Preview Window */}
            <div className="flex-1 border-2 border-dashed border-border rounded-xl p-2 bg-muted/20 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-10 backdrop-blur-md">
                Live Preview
              </div>
              <video 
                src={URL.createObjectURL(file)} 
                controls 
                className="max-w-full max-h-[300px] object-contain rounded-lg shadow-lg"
              />
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
              <p className="text-sm font-medium animate-pulse">Processing media locally...</p>
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
            {/* If it's an mp4 we use video, otherwise img for gif */}
            {outputExt === ".mp4" ? (
              <video src={resultUrl} controls autoPlay loop className="max-w-full max-h-[600px] object-contain" />
            ) : (
              <img src={resultUrl} alt="Generated output" className="max-w-full max-h-[600px] object-contain" />
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`gifter_output_${Date.now()}${outputExt || ""}`}
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
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
