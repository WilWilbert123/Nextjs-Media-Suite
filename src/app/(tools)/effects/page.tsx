"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, Sparkles, Loader2, Palette, Wand2, Clock } from "lucide-react";

export default function EffectsToolPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [isGif, setIsGif] = React.useState(false);
  
  // Effects State
  const [speed, setSpeed] = React.useState<number>(1.0); 
  const [colorFilter, setColorFilter] = React.useState<string>("none"); 
  const [styleFilter, setStyleFilter] = React.useState<string>("none"); 
  
  const { isReady, isProcessing, progress, error, convertVideo } = useMediaEngine();
  const previewVideoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setIsGif(file.type.includes("gif") || file.name.toLowerCase().endsWith(".gif"));
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
      setResultUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  React.useEffect(() => {
    // Clear result if user edits settings so they can re-render
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    // Set playback speed for live preview
    if (previewVideoRef.current) {
      previewVideoRef.current.playbackRate = speed;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed, colorFilter, styleFilter]);

  const getCssFilter = () => {
    let f = "";
    switch (colorFilter) {
      case "grayscale": f += "grayscale(1) "; break;
      case "sepia": f += "sepia(1) "; break;
      case "invert": f += "invert(1) "; break;
      case "high-contrast": f += "contrast(1.5) brightness(1.05) saturate(1.2) "; break;
      case "vintage": f += "sepia(0.6) contrast(1.1) brightness(0.9) "; break;
      case "cyberpunk": f += "hue-rotate(90deg) saturate(1.5) contrast(1.2) "; break;
    }
    switch (styleFilter) {
      case "blur": f += "blur(5px) "; break;
      case "sharpen": f += "contrast(1.2) "; break; // approximation
    }
    return f.trim();
  };

  const handleProcess = async () => {
    if (!file) return;
    
    const outputExt = isGif ? ".gif" : ".mp4";
    
    const vFilters: string[] = [];
    const aFilters: string[] = [];
    
    // Speed Filter
    if (speed !== 1.0) {
      const vSpeed = 1.0 / speed;
      vFilters.push(`setpts=${vSpeed}*PTS`);
      
      if (!isGif) {
        if (speed === 4.0) {
          aFilters.push("atempo=2.0,atempo=2.0");
        } else if (speed === 0.25) {
          aFilters.push("atempo=0.5,atempo=0.5");
        } else {
          aFilters.push(`atempo=${speed}`);
        }
      }
    }
    
    // Color Filters
    switch (colorFilter) {
      case "grayscale": vFilters.push("hue=s=0"); break;
      case "sepia": vFilters.push("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0"); break;
      case "invert": vFilters.push("negate"); break;
      case "high-contrast": vFilters.push("eq=contrast=1.5:brightness=0.05:saturation=1.2"); break;
      case "vintage": vFilters.push("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0,vignette=PI/3"); break;
      case "cyberpunk": vFilters.push("colorchannelmixer=1:0:0:0:0:1:0:0:0:0:1.5:0,eq=saturation=1.5"); break;
    }

    // Stylized Filters
    switch (styleFilter) {
      case "blur": vFilters.push("boxblur=5:1"); break;
      case "sharpen": vFilters.push("unsharp=5:5:1.5:5:5:0.0"); break;
      case "pixelate": vFilters.push("scale=iw/10:-1,scale=10*iw:-1:flags=neighbor"); break;
      case "edge": vFilters.push("edgedetect=low=0.1:high=0.4"); break;
      case "vignette": vFilters.push("vignette=PI/4"); break;
    }
    
    let args: string[] = [];
    if (vFilters.length > 0) {
      if (isGif) {
        args = ["-vf", vFilters.join(",")];
      } else {
        if (aFilters.length > 0) {
          args = [
            "-filter_complex", 
            `[0:v]${vFilters.join(",")}[v];[0:a]${aFilters.join(",")}[a]`,
            "-map", "[v]", 
            "-map", "[a]",
          ];
        } else {
          args = ["-vf", vFilters.join(",")];
        }
        args.push("-movflags", "faststart", "-pix_fmt", "yuv420p");
      }
    } else {
      args = ["-c", "copy"];
    }

    const url = await convertVideo(file, args, outputExt);
    if (url) {
      if (resultUrl && resultUrl !== previewUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(url);
    }
  };

  const handleReset = () => {
    if (resultUrl && resultUrl !== previewUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setFile(null);
    setSpeed(1.0);
    setColorFilter("none");
    setStyleFilter("none");
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto p-4 glass-card smooth-show h-[calc(100vh-6rem)]">
      
      <div className="flex flex-col gap-1 text-center items-center shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-1 smooth-shadow">
          <Sparkles className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Effects Studio</h1>
        <p className="text-sm text-muted-foreground">
          Apply professional color grading, stylized filters, and speed manipulation in real-time.
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
                <Sparkles className="w-4 h-4 text-primary" /> Effects Preview
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
              
              {isProcessing && (
                <div className="absolute top-2 left-2 z-50 bg-background/80 backdrop-blur-md px-2 py-1 rounded-full border border-border/50 flex items-center gap-1.5 shadow-sm">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
              )}

              {(resultUrl || previewUrl) && (
                <div className="w-full h-full flex items-center justify-center relative">
                  {!isGif ? (
                    <video 
                      ref={previewVideoRef}
                      src={resultUrl || previewUrl!} 
                      controls 
                      autoPlay 
                      loop 
                      style={!resultUrl ? { filter: getCssFilter() } : undefined}
                      className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-300 ${!resultUrl && styleFilter === 'pixelate' ? 'pixelated-rendering' : ''}`}
                    />
                  ) : (
                    <img 
                      src={resultUrl || previewUrl!} 
                      alt="Effects Output" 
                      style={!resultUrl ? { filter: getCssFilter() } : undefined}
                      className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-300 ${!resultUrl && styleFilter === 'pixelate' ? 'pixelated-rendering' : ''}`}
                    />
                  )}
                </div>
              )}
            </div>
            
            {error && (
              <p className="text-xs text-destructive text-center p-2 bg-destructive/10 rounded-lg shrink-0">
                {error}
              </p>
            )}
          </div>

          {/* RIGHT: Controls */}
          <div className="flex-[2] flex flex-col gap-4 min-w-0 h-full overflow-y-auto pr-1 custom-scrollbar">
            
            {/* Color Grading */}
            <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50 shrink-0">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm">Color Grading</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "none", label: "Original" },
                  { id: "grayscale", label: "Grayscale" },
                  { id: "sepia", label: "Sepia" },
                  { id: "vintage", label: "Vintage" },
                  { id: "high-contrast", label: "High Contrast" },
                  { id: "cyberpunk", label: "Cyberpunk" },
                  { id: "invert", label: "Invert (Negative)" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setColorFilter(f.id)}
                    className={`py-2 px-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border ${
                      colorFilter === f.id 
                        ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                        : "bg-background border-border/50 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stylized FX */}
            <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50 shrink-0">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm">Stylized FX</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "none", label: "None" },
                  { id: "vignette", label: "Vignette" },
                  { id: "blur", label: "Box Blur" },
                  { id: "sharpen", label: "Sharpen" },
                  { id: "pixelate", label: "Pixelate 8-bit" },
                  { id: "edge", label: "Edge Detect" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStyleFilter(f.id)}
                    className={`py-2 px-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border ${
                      styleFilter === f.id 
                        ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                        : "bg-background border-border/50 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Manipulation */}
            <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50 shrink-0">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm">Time Machine</h3>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[0.25, 0.5, 1.0, 1.5, 2.0, 4.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`py-2 px-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border ${
                      speed === s 
                        ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                        : "bg-background border-border/50 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {s}x {s === 1.0 && "(Norm)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto shrink-0 pt-2 flex flex-col gap-3">
              {!resultUrl ? (
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all shadow-md bg-primary text-primary-foreground hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                  {isProcessing ? "Rendering..." : "Apply & Render"}
                </button>
              ) : (
                <a
                  href={resultUrl}
                  download={`effects_studio_output_${Date.now()}${isGif ? '.gif' : '.mp4'}`}
                  className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]"
                >
                  <Download className="w-5 h-5" /> 
                  Download FX {isGif ? 'GIF' : 'MP4'}
                </a>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
