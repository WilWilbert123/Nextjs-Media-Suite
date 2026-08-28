"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, RefreshCw, Loader2, Sparkles } from "lucide-react";

export default function EffectsToolPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  
  // Effects State
  const [speed, setSpeed] = React.useState<number>(1.0); // 0.5x, 1x, 2x
  const [colorFilter, setColorFilter] = React.useState<string>("none"); // none, grayscale, sepia, invert
  
  const { isReady, isProcessing, progress, error, convertVideo } = useMediaEngine();

  const handleProcess = async () => {
    if (!file) return;
    
    const isGif = file.type.includes("gif") || file.name.toLowerCase().endsWith(".gif");
    const outputExt = isGif ? ".gif" : ".mp4";
    
    const vFilters: string[] = [];
    const aFilters: string[] = [];
    
    // Speed Filter
    if (speed !== 1.0) {
      const vSpeed = 1.0 / speed;
      vFilters.push(`setpts=${vSpeed}*PTS`);
      aFilters.push(`atempo=${speed}`);
    }
    
    // Color Filters
    if (colorFilter === "grayscale") {
      vFilters.push("hue=s=0");
    } else if (colorFilter === "sepia") {
      vFilters.push("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0");
    } else if (colorFilter === "invert") {
      vFilters.push("negate");
    }
    
    let args: string[] = [];
    if (vFilters.length > 0) {
      if (isGif) {
        // GIFs don't have audio
        args = ["-vf", vFilters.join(",")];
      } else {
        // MP4s might have audio
        args = ["-filter_complex", `[0:v]${vFilters.join(",")}[v]`];
        if (aFilters.length > 0) {
          args.push(`;[0:a]${aFilters.join(",")}[a]`, "-map", "[v]", "-map", "[a]");
        } else {
          // If no audio filter, just map the processed video and copy audio
          // However, filter_complex doesn't allow mixing -c:a copy easily with complex map if we don't map it.
          // Wait, we can just use -vf if there's no audio manipulation!
          args = ["-vf", vFilters.join(",")];
        }
        args.push("-movflags", "faststart", "-pix_fmt", "yuv420p");
      }
    } else {
      args = ["-c", "copy"];
    }

    // Special case for complex audio+video mapping
    if (vFilters.length > 0 && aFilters.length > 0 && !isGif) {
      args = [
        "-filter_complex", 
        `[0:v]${vFilters.join(",")}[v];[0:a]${aFilters.join(",")}[a]`,
        "-map", "[v]", 
        "-map", "[a]",
        "-movflags", "faststart", 
        "-pix_fmt", "yuv420p"
      ];
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
    setSpeed(1.0);
    setColorFilter("none");
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          Special Effects
        </h1>
        <p className="text-muted-foreground">
          Apply color grading and manipulate playback speed for your media.
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
              {/* Speed Control */}
              <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                <label className="text-sm font-medium">Playback Speed</label>
                <div className="grid grid-cols-3 gap-2">
                  {[0.5, 1.0, 2.0].map((val) => (
                    <button
                      key={val}
                      onClick={() => setSpeed(val)}
                      className={`py-3 rounded-lg border-2 font-medium transition-all ${
                        speed === val 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {val}x {val === 1.0 && "(Normal)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Filter */}
              <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                <label className="text-sm font-medium">Color Filter</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["none", "grayscale", "sepia", "invert"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setColorFilter(filter)}
                      className={`py-3 rounded-lg border-2 font-medium capitalize transition-all ${
                        colorFilter === filter 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleProcess}
                className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all w-full mt-auto"
              >
                Apply & Encode Effects
              </button>
            </div>

            {/* Live Preview Window */}
            <div className="flex-1 border-2 border-dashed border-border rounded-xl p-2 bg-muted/20 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-10 backdrop-blur-md">
                Live Preview
              </div>
              {file.type.includes("video") ? (
                <video 
                  key={`preview-${speed}`} // Force re-render for playbackRate
                  src={URL.createObjectURL(file)} 
                  autoPlay 
                  loop 
                  muted
                  className="max-w-full max-h-[400px] object-contain rounded-lg"
                  style={{ 
                    filter: colorFilter === "none" ? "none" : `${colorFilter}(100%)`,
                  }}
                  ref={(el) => {
                    if (el) el.playbackRate = speed;
                  }}
                />
              ) : (
                <img 
                  src={URL.createObjectURL(file)} 
                  alt="Preview" 
                  className="max-w-full max-h-[400px] object-contain rounded-lg"
                  style={{ 
                    filter: colorFilter === "none" ? "none" : `${colorFilter}(100%)`,
                  }}
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
                <span className="absolute text-xs font-bold">{Math.round(progress * 100)}%</span>
              </div>
              <p className="text-sm font-medium animate-pulse">Rendering effects locally...</p>
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
              <img src={resultUrl} alt="Filtered output" className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg" />
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`gifter_effects_${Date.now()}${file?.name.endsWith('.gif') ? '.gif' : '.mp4'}`}
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
              Apply to Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
