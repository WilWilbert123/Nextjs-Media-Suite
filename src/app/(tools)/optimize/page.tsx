"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, Zap, Loader2, Gauge, Scale, Clock, Palette } from "lucide-react";
// @ts-ignore
import gifsicle from "gifsicle-wasm-browser";

export default function OptimizeToolPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [resultSize, setResultSize] = React.useState<number | null>(null);
  const [isGif, setIsGif] = React.useState(false);
  
  // Settings
  const [quality, setQuality] = React.useState<number>(50); // 1-100
  const [scale, setScale] = React.useState<string>("1.0"); // 1.0, 0.75, 0.5, 0.25
  const [fps, setFps] = React.useState<string>("original"); // original, 24, 15, 10
  const [grayscale, setGrayscale] = React.useState<boolean>(false);
  
  const { isReady, isProcessing, progress, error, convertVideo } = useMediaEngine();
  const [isGifsicleProcessing, setIsGifsicleProcessing] = React.useState(false);
  const [gifsicleError, setGifsicleError] = React.useState<string | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setIsGif(file.type.includes("gif") || file.name.toLowerCase().endsWith(".gif"));
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
      setResultUrl(null);
      setResultSize(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  React.useEffect(() => {
    // Clear result if user edits settings so they can re-render
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
      setResultSize(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, scale, fps, grayscale]);

  const handleProcess = async () => {
    if (!file) return;
    
    if (isGif) {
      // GIF optimization via Gifsicle
      setIsGifsicleProcessing(true);
      setGifsicleError(null);
      try {
        const lossyValue = Math.floor(200 - (quality / 100) * 190); 
        let cmd = [`-O3`, `--lossy=${lossyValue}`];
        
        if (scale !== "1.0") {
          cmd.push(`--scale`, scale);
        }
        
        if (grayscale) {
          cmd.push(`--use-colormap`, `gray`);
        }
        
        // Gifsicle doesn't easily do straight FPS drops without frame delay math, 
        // so we'll skip FPS for gifsicle in this basic impl, or rely on FFmpeg for GIF if FPS is needed.
        // Actually, let's keep it simple and just run gifsicle.
        
        cmd.push(`input.gif`, `-o`, `/out/out.gif`);

        const outFiles = await gifsicle.run({
          input: [{ file: file, name: "input.gif" }],
          command: [cmd.join(" ")],
        });
        
        if (outFiles && outFiles.length > 0) {
          const outBlob = new Blob([outFiles[0]], { type: "image/gif" });
          setResultSize(outBlob.size);
          if (resultUrl && resultUrl !== previewUrl) URL.revokeObjectURL(resultUrl);
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
      // MP4 optimization via FFmpeg
      const crfValue = Math.floor(51 - (quality / 100) * 33);
      
      const args = [
        "-vcodec", "libx264", 
        "-crf", crfValue.toString(), 
        "-preset", "ultrafast",
        "-movflags", "faststart"
      ];
      
      const filters = [];
      
      if (scale !== "1.0") {
        // scale logic ensuring divisible by 2
        filters.push(`scale=trunc(iw*${scale}/2)*2:trunc(ih*${scale}/2)*2`);
      }
      
      if (grayscale) {
        filters.push(`format=gray`);
      }
      
      if (filters.length > 0) {
        args.push("-vf", filters.join(","));
      }
      
      if (fps !== "original") {
        args.push("-r", fps);
      }

      const url = await convertVideo(file, args, ".mp4");
      if (url) {
        if (resultUrl && resultUrl !== previewUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(url);
        const res = await fetch(url);
        const blob = await res.blob();
        setResultSize(blob.size);
      }
    }
  };

  const handleReset = () => {
    if (resultUrl && resultUrl !== previewUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setResultSize(null);
    setFile(null);
    setQuality(50);
    setScale("1.0");
    setFps("original");
    setGrayscale(false);
  };

  const activeProcessing = isProcessing || isGifsicleProcessing;
  const activeError = error || gifsicleError;

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto p-4 glass-card smooth-show h-[calc(100vh-6rem)]">
      
      <div className="flex flex-col gap-1 text-center items-center shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-1 smooth-shadow">
          <Zap className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Optimizer Studio</h1>
        <p className="text-sm text-muted-foreground">
          Drastically reduce file sizes with advanced compression, scaling, and color grading.
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
            accept="video/mp4,video/webm,image/gif"
          />
        </div>
      )}

      {isReady && file && previewUrl && (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 bg-card border border-border/50 rounded-2xl p-4 md:p-6 smooth-shadow">
          
          {/* LEFT: Live Preview */}
          <div className="flex-[3] flex flex-col gap-4 min-w-0 h-full relative">
            <div className="flex items-center justify-between border-b border-border/50 pb-3 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Optimization Preview
              </h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleReset}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 uppercase tracking-wider"
                >
                  Change File
                </button>
              </div>
            </div>

            <div className="flex-1 bg-black/5 rounded-xl border border-border/50 flex flex-col items-center justify-center p-4 relative pattern-dots overflow-hidden min-h-0 smooth-shadow">
              
              {activeProcessing && (
                <div className="absolute top-2 left-2 z-50 bg-background/80 backdrop-blur-md px-2 py-1 rounded-full border border-border/50 flex items-center gap-1.5 shadow-sm">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {isProcessing ? `${Math.round(progress * 100)}%` : '...'}
                  </span>
                </div>
              )}

              {(resultUrl || previewUrl) && (
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-lg">
                  {!isGif ? (
                    <video 
                      src={resultUrl || previewUrl!} 
                      controls 
                      autoPlay 
                      loop 
                      muted
                      style={!resultUrl ? { 
                        filter: grayscale ? 'grayscale(1)' : 'none',
                        transform: `scale(${scale})`,
                        transition: 'all 0.3s ease'
                      } : undefined}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                    />
                  ) : (
                    <img 
                      src={resultUrl || previewUrl!} 
                      alt="Optimized Output" 
                      style={!resultUrl ? { 
                        filter: grayscale ? 'grayscale(1)' : 'none',
                        transform: `scale(${scale})`,
                        transition: 'all 0.3s ease'
                      } : undefined}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                    />
                  )}
                </div>
              )}
            </div>

            {/* Savings Bar */}
            {resultSize !== null && (
              <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-xl border border-border/50 shrink-0">
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Original</span>
                  <span className="font-mono text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex-1 flex flex-col items-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Optimized</span>
                  <span className="font-mono text-sm text-emerald-500">{(resultSize / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex-[2] h-4 bg-secondary rounded-full overflow-hidden flex relative border border-border">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(0, (resultSize / file.size) * 100))}%` }} 
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold mix-blend-difference text-white">
                    -{Math.max(0, 100 - Math.round((resultSize / file.size) * 100))}% smaller
                  </span>
                </div>
              </div>
            )}
            
            {activeError && (
              <p className="text-xs text-destructive text-center p-2 bg-destructive/10 rounded-lg">
                {activeError}
              </p>
            )}
          </div>

          {/* RIGHT: Controls */}
          <div className="flex-[2] flex flex-col gap-4 min-w-0 h-full overflow-y-auto pr-1 custom-scrollbar">
            
            {/* Quality Slider */}
            <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm">Compression Engine</h3>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{quality}%</span>
              </div>

              <div className="flex flex-col gap-2">
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  step="1"
                  value={quality} 
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1">
                  <span>Max Crunch (Small)</span>
                  <span>Max Quality (Large)</span>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Scale className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Advanced Reduction</h3>
              </div>

              {/* Resolution Scale */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <Scale className="w-3 h-3" /> Scale Resolution
                </label>
                <div className="flex bg-background p-1 rounded-lg border border-border/50">
                   {['1.0', '0.75', '0.5', '0.25'].map(s => (
                     <button
                        key={s}
                        onClick={() => setScale(s)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                          scale === s ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s === '1.0' ? '100%' : `${parseFloat(s) * 100}%`}
                      </button>
                   ))}
                </div>
              </div>

              {/* FPS (Only MP4) */}
              {!isGif && (
                <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Drop Frame Rate
                  </label>
                  <div className="flex bg-background p-1 rounded-lg border border-border/50">
                     {['original', '24', '15', '10'].map(f => (
                       <button
                          key={f}
                          onClick={() => setFps(f)}
                          className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${
                            fps === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {f === 'original' ? 'Orig' : `${f}fps`}
                        </button>
                     ))}
                  </div>
                </div>
              )}

              {/* Grayscale Toggle */}
              <div className="pt-2 border-t border-border/50">
                <label className="flex items-center gap-3 bg-background p-3 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={grayscale}
                    onChange={(e) => setGrayscale(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                      <Palette className="w-3 h-3" /> Grayscale Mode
                    </span>
                    <span className="text-[10px] text-muted-foreground">Removes color data to save size</span>
                  </div>
                </label>
              </div>

            </div>

            <div className="mt-auto shrink-0 pt-2 flex flex-col gap-3">
              {!resultUrl ? (
                <button
                  onClick={handleProcess}
                  disabled={activeProcessing}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all shadow-md bg-primary text-primary-foreground hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {activeProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  {activeProcessing ? "Compressing..." : "Apply & Compress"}
                </button>
              ) : (
                <a
                  href={resultUrl}
                  download={`optimized_studio_output_${Date.now()}${isGif ? '.gif' : '.mp4'}`}
                  className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]"
                >
                  <Download className="w-5 h-5" /> 
                  Download Optimized {isGif ? 'GIF' : 'MP4'}
                </a>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
