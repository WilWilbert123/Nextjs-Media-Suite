"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, Film, Loader2, Settings2, Scissors, History, Activity, MonitorPlay } from "lucide-react";

export default function VideoToolsPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  
  // Settings
  const [format, setFormat] = React.useState<"mp4" | "gif">("mp4");
  const [trimStart, setTrimStart] = React.useState<number>(0);
  const [duration, setDuration] = React.useState<number>(5);
  const [isReversed, setIsReversed] = React.useState<boolean>(false);
  const [quality, setQuality] = React.useState<string>("original");
  const [speed, setSpeed] = React.useState<string>("1.0");
  
  const { isReady, isProcessing, progress, error, engine } = useMediaEngine();
  const previewVideoRef = React.useRef<HTMLVideoElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const reverseIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResultUrl(null);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
      setResultUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  React.useEffect(() => {
    // Clear result if user edits settings so they can re-render
    if (resultUrl && resultUrl !== previewUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setResultUrl(null);

    // Real-time preview updates
    if (previewVideoRef.current && !resultUrl) {
      const vid = previewVideoRef.current;
      
      if (reverseIntervalRef.current) {
        clearInterval(reverseIntervalRef.current);
        reverseIntervalRef.current = null;
      }

      if (isReversed) {
        vid.pause();
        vid.currentTime = trimStart + duration; // Start at the end
        const step = 0.05 * (parseFloat(speed) || 1.0);
        reverseIntervalRef.current = setInterval(() => {
          if (previewVideoRef.current) {
            let nextTime = previewVideoRef.current.currentTime - step;
            if (nextTime <= trimStart) {
              nextTime = trimStart + duration; // Loop back to end
            }
            previewVideoRef.current.currentTime = nextTime;
          }
        }, 50);
      } else {
        vid.playbackRate = parseFloat(speed) || 1.0;
        vid.currentTime = trimStart;
        vid.play().catch(() => {});
      }
    }
    
    return () => {
      if (reverseIntervalRef.current) clearInterval(reverseIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, trimStart, duration, isReversed, quality, speed]);

  const handleTimeUpdate = () => {
    if (previewVideoRef.current && !resultUrl && duration > 0 && !isReversed) {
      const vid = previewVideoRef.current;
      if (vid.currentTime >= trimStart + duration || vid.currentTime < trimStart) {
        vid.currentTime = trimStart;
      }
    }
  };

  const handleProcess = async () => {
    if (!file || !engine.current) return;
    
    try {
      const inputExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const outputName = 'output.' + format;
      
      const fileData = await file.arrayBuffer();
      await engine.current.writeFile('input.' + inputExt, new Uint8Array(fileData));
      
      let args: string[] = [];

      // Handle trimming
      if (trimStart > 0 || duration > 0) {
        args.push("-ss", trimStart.toString());
        if (duration > 0) {
          args.push("-t", duration.toString());
        }
      }
      
      args.push("-i", 'input.' + inputExt);

      const filters = [];
      const audioFilters: string[] = [];
      
      // Video speed
      if (speed !== "1.0") {
        const speedNum = parseFloat(speed);
        filters.push(`setpts=${1 / speedNum}*PTS`);
        
        if (format === "mp4") {
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
        if (format === "mp4") {
          audioFilters.push("areverse");
        }
      }

      if (format === "gif") {
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

      args.push("-y", outputName);

      await engine.current.exec(args);
      
      const data = await engine.current.readFile(outputName);
      
      const mimeType = format === 'gif' ? 'image/gif' : 'video/mp4';
      const blob = new Blob([data], { type: mimeType });
      
      if (resultUrl && resultUrl !== previewUrl) {
        URL.revokeObjectURL(resultUrl);
      }
      
      setResultUrl(URL.createObjectURL(blob));
      
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleReset = () => {
    if (resultUrl && resultUrl !== previewUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setFile(null);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto p-4 glass-card smooth-show h-[calc(100vh-6rem)]">
      
      <div className="flex flex-col gap-1 text-center items-center shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-1 smooth-shadow">
          <Film className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Video Converter Studio</h1>
        <p className="text-sm text-muted-foreground">
          Trim, reverse, and convert MP4s into high-quality GIFs in real-time.
        </p>
      </div>

      {!isReady && (
        <div className="flex-1 border border-border/50 rounded-xl bg-card flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium text-sm">Initializing Media Engine...</p>
        </div>
      )}

      {isReady && !file && (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <FileUploader
            onFileSelect={(f) => setFile(Array.isArray(f) ? f[0] : f)}
            accept="video/mp4,video/webm,image/gif,video/quicktime"
          />
        </div>
      )}

      {isReady && file && previewUrl && (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 bg-card border border-border/50 rounded-2xl p-4 md:p-6 smooth-shadow">
          
          {/* LEFT: Live Preview */}
          <div className="flex-[3] flex flex-col gap-4 min-w-0 h-full relative">
            <div className="flex items-center justify-between border-b border-border/50 pb-3 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-primary" /> Live Preview
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <p className="font-bold text-xs truncate max-w-[150px]">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 uppercase tracking-wider"
                >
                  Change
                </button>
              </div>
            </div>

            <div className="flex-1 bg-black/5 rounded-xl border border-border/50 flex flex-col items-center justify-center p-4 relative pattern-dots overflow-hidden min-h-0 smooth-shadow">
              
              {isProcessing && (
                <div className="absolute top-2 left-2 z-50 bg-background/80 backdrop-blur-md px-2 py-1 rounded-full border border-border/50 flex items-center gap-1.5 shadow-sm">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
              )}

              {(resultUrl || previewUrl) && (
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-lg">
                  {format === "mp4" || !resultUrl ? (
                    <video 
                      ref={previewVideoRef}
                      src={resultUrl || previewUrl!} 
                      controls 
                      autoPlay 
                      loop 
                      onTimeUpdate={handleTimeUpdate}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all" 
                    />
                  ) : (
                    <img 
                      src={resultUrl} 
                      alt="Output Preview" 
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                    />
                  )}
                </div>
              )}
            </div>
            
            {error && (
              <p className="text-xs text-destructive text-center p-2 bg-destructive/10 rounded-lg">
                {error}
              </p>
            )}
          </div>

          {/* RIGHT: Controls */}
          <div className="flex-[2] flex flex-col gap-4 min-w-0 h-full overflow-y-auto pr-1 custom-scrollbar">
            
            {/* Format Selection */}
            <div className="flex bg-background p-1 rounded-xl border border-border/50 shrink-0">
               <button
                  onClick={() => setFormat("mp4")}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                    format === "mp4" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  .MP4 Video
                </button>
                <button
                  onClick={() => setFormat("gif")}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                    format === "gif" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  .GIF Animation
                </button>
            </div>

            {/* Trimming */}
            <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Scissors className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Trim Timeline</h3>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Start (sec)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={trimStart}
                    onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary/50 outline-none"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Duration (sec)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={duration}
                    onChange={(e) => setDuration(parseFloat(e.target.value) || 1)}
                    className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary/50 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Effects */}
            <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Effects & Quality</h3>
              </div>

              {/* Reverse Control */}
              <label className="flex items-center gap-3 bg-background p-3 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="checkbox"
                  checked={isReversed}
                  onChange={(e) => setIsReversed(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-xs uppercase tracking-wider">Reverse Video</span>
                  <span className="text-[10px] text-muted-foreground">Boomerang playback effect</span>
                </div>
              </label>

              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Playback Speed</label>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary/50 outline-none"
                >
                  <option value="0.25">0.25x (Super Slow)</option>
                  <option value="0.5">0.5x (Slow)</option>
                  <option value="1.0">1x (Normal)</option>
                  <option value="1.5">1.5x (Fast)</option>
                  <option value="2.0">2x (Fast)</option>
                  <option value="4.0">4x (Super Fast)</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Output Quality / Width</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary/50 outline-none"
                >
                  <option value="original">Original Resolution</option>
                  <option value="1920">1080p (1920w)</option>
                  <option value="1280">720p (1280w)</option>
                  <option value="854">480p (854w)</option>
                  <option value="640">360p (640w)</option>
                  <option value="426">240p (426w)</option>
                </select>
              </div>

            </div>

            <div className="mt-auto shrink-0 pt-2 flex flex-col gap-3">
              {!resultUrl ? (
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all shadow-md bg-primary text-primary-foreground hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Film className="w-5 h-5" />}
                  {isProcessing ? "Rendering..." : "Apply & Render"}
                </button>
              ) : (
                <a
                  href={resultUrl}
                  download={`video_studio_output_${Date.now()}.${format}`}
                  className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]"
                >
                  <Download className="w-5 h-5" /> 
                  Download .{format.toUpperCase()}
                </a>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
