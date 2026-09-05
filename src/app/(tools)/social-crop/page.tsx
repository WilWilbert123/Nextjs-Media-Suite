"use client";

import * as React from "react";
import { Crop, Loader2, Download, Smartphone, Square, MonitorPlay, Maximize, AppWindow, Blend, Settings2, Hand } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";

type AspectRatio = "9:16" | "1:1" | "16:9" | "4:5";
type ResizeMode = "blur" | "black" | "crop";

const RATIOS = {
  "9:16": { w: 1080, h: 1920, label: "Vertical", desc: "TikTok, Reels, Shorts", icon: Smartphone, css: "aspect-[9/16]" },
  "4:5": { w: 1080, h: 1350, label: "Portrait", desc: "Instagram Feed", icon: AppWindow, css: "aspect-[4/5]" },
  "1:1": { w: 1080, h: 1080, label: "Square", desc: "Instagram Post", icon: Square, css: "aspect-square" },
  "16:9": { w: 1920, h: 1080, label: "Widescreen", desc: "YouTube", icon: MonitorPlay, css: "aspect-video" },
};

export default function SocialCropPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  
  const [ratio, setRatio] = React.useState<AspectRatio>("9:16");
  const [mode, setMode] = React.useState<ResizeMode>("blur");
  
  // Dragging State for "crop" mode
  const [cropPos, setCropPos] = React.useState({ x: 50, y: 50 }); // percentages
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0, initPx: 50, initPy: 50 });

  const { isReady, isProcessing, progress, error, engine } = useMediaEngine();
  const [isVideo, setIsVideo] = React.useState(false);

  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setIsVideo(file.type.includes("video"));
      setCropPos({ x: 50, y: 50 }); // reset crop pos
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'crop') return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragStartRef.current = { x: clientX, y: clientY, initPx: cropPos.x, initPy: cropPos.y };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || mode !== 'crop') return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    
    const sensitivity = 0.3; // tweak this to make drag feel natural
    
    // If mouse goes right (dx > 0), image goes right, object-position goes towards 0%
    let newX = dragStartRef.current.initPx - (dx * sensitivity);
    let newY = dragStartRef.current.initPy - (dy * sensitivity);
    
    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));
    
    setCropPos({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleExport = async () => {
    if (!file || !engine.current) return;
    
    try {
      const inputExt = file.name.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'png');
      const outputName = 'output.' + inputExt;
      
      const fileData = await file.arrayBuffer();
      await engine.current.writeFile('input.' + inputExt, new Uint8Array(fileData));
      
      const target = RATIOS[ratio];
      const W = target.w;
      const H = target.h;
      
      let filter = "";
      
      if (mode === "black") {
        filter = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black`;
      } else if (mode === "crop") {
        // Use dynamically calculated crop offset based on user drag
        // iw/ih are the width/height of the video AFTER the scale=force_original_aspect_ratio=increase
        filter = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}:(iw-${W})*${cropPos.x}/100:(ih-${H})*${cropPos.y}/100`;
      } else if (mode === "blur") {
        filter = `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=20:20[bg];[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`;
      }
      
      const command = [
        '-i', 'input.' + inputExt,
        '-filter_complex', filter,
      ];
      
      if (isVideo) {
        command.push('-c:a', 'copy');
        command.push('-preset', 'fast');
      }
      
      command.push('-y', outputName);
      
      await engine.current.exec(command);
      const data = await engine.current.readFile(outputName);
      
      const mimeType = isVideo ? 'video/mp4' : file.type;
      const blob = new Blob([data], { type: mimeType });
      
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `social_ready_${Date.now()}.${inputExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err: any) {
      console.error(err);
    }
  };

  const currentRatio = RATIOS[ratio];

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto p-4 glass-card smooth-show h-[calc(100vh-6rem)]">
      
      <div className="flex flex-col gap-1 text-center items-center shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-1 smooth-shadow">
          <Crop className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Social Aspect Ratio Studio</h1>
        <p className="text-sm text-muted-foreground">
          Auto-frame your videos & images for social media instantly with real-time preview.
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
            accept="video/*,image/*"
          />
        </div>
      )}

      {isReady && file && previewUrl && (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 bg-card border border-border/50 rounded-2xl p-4 md:p-6 smooth-shadow">
          
          {/* LEFT: Live Preview */}
          <div className="flex-[3] flex flex-col gap-4 min-w-0 h-full relative">
            <div className="flex items-center justify-between border-b border-border/50 pb-3 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Crop className="w-4 h-4 text-primary" /> Live Frame Preview
              </h3>
              <button
                onClick={() => setFile(null)}
                disabled={isProcessing}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 uppercase tracking-wider disabled:opacity-50"
              >
                Change Media
              </button>
            </div>

            <div className="flex-1 bg-black/5 rounded-xl border border-border/50 flex flex-col items-center justify-center p-4 relative pattern-dots overflow-hidden min-h-0 smooth-shadow">
              
              {isProcessing && (
                <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-bold text-lg">Exporting Media...</span>
                    <span className="text-sm font-mono bg-secondary px-3 py-1 rounded-full border border-border/50">
                      {Math.round(progress * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Real-time Preview Container */}
              <div 
                className={`relative overflow-hidden bg-black flex items-center justify-center shadow-2xl transition-all ring-4 ring-primary/20 ${currentRatio.css} ${mode === 'crop' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{ 
                  maxHeight: '100%', 
                  maxWidth: '100%',
                  height: ratio === '16:9' ? 'auto' : '100%',
                  width: ratio === '16:9' ? '100%' : 'auto'
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                onMouseMove={handleMouseMove}
                onTouchMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchEnd={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                
                {/* Background Layer (for Blur mode) */}
                {mode === "blur" && (
                  isVideo ? (
                    <video src={previewUrl} className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-70" autoPlay loop muted playsInline />
                  ) : (
                    <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-70" />
                  )
                )}

                {/* Foreground Layer */}
                {isVideo ? (
                  <video 
                    src={previewUrl} 
                    className={`relative z-10 w-full h-full ${mode === 'crop' ? 'object-cover pointer-events-none' : 'object-contain'}`}
                    style={{ objectPosition: mode === 'crop' ? `${cropPos.x}% ${cropPos.y}%` : '50% 50%' }}
                    autoPlay loop muted playsInline 
                  />
                ) : (
                  <img 
                    src={previewUrl} 
                    className={`relative z-10 w-full h-full ${mode === 'crop' ? 'object-cover pointer-events-none' : 'object-contain'}`}
                    style={{ objectPosition: mode === 'crop' ? `${cropPos.x}% ${cropPos.y}%` : '50% 50%' }}
                  />
                )}

                {mode === 'crop' && (
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur px-2 py-1 rounded-md border border-border/50 text-[10px] font-bold text-muted-foreground flex items-center gap-1 z-20 pointer-events-none">
                    <Hand className="w-3 h-3" /> DRAG TO RECENTER
                  </div>
                )}
                
              </div>
            </div>
            {error && (
              <p className="text-xs text-destructive text-center p-2 bg-destructive/10 rounded-lg">
                {error}
              </p>
            )}
          </div>

          {/* RIGHT: Controls */}
          <div className="flex-[2] flex flex-col gap-4 min-w-0 h-full overflow-y-auto pr-1 custom-scrollbar">
            
            <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Settings2 className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Target Platform</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(RATIOS).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = ratio === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setRatio(key as AspectRatio)}
                      className={`flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left ${
                        isSelected 
                          ? "bg-primary text-primary-foreground border-primary shadow-md" 
                          : "bg-card border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold font-mono text-xs tracking-wider">{key}</span>
                        <Icon className="w-4 h-4 opacity-70" />
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${isSelected ? 'text-primary-foreground/80' : ''}`}>{config.label}</span>
                      <span className={`text-[10px] truncate w-full ${isSelected ? 'text-primary-foreground/60' : 'opacity-60'}`}>{config.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Maximize className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Framing Mode</h3>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setMode("blur")}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    mode === "blur" ? "bg-card border-primary shadow-sm text-foreground" : "bg-transparent border-transparent text-muted-foreground hover:bg-card/50"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${mode === "blur" ? "bg-primary/10 text-primary" : "bg-secondary"}`}>
                    <Blend className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs uppercase tracking-wider">Blur Background</span>
                    <span className="text-[10px] opacity-70">Fill space with blurred copy (Best for Vertical)</span>
                  </div>
                </button>

                <button
                  onClick={() => setMode("black")}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    mode === "black" ? "bg-card border-primary shadow-sm text-foreground" : "bg-transparent border-transparent text-muted-foreground hover:bg-card/50"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${mode === "black" ? "bg-primary/10 text-primary" : "bg-secondary"}`}>
                    <AppWindow className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs uppercase tracking-wider">Fit (Black Bars)</span>
                    <span className="text-[10px] opacity-70">Show entire video, add black padding</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMode("crop");
                    setCropPos({ x: 50, y: 50 }); // Reset position when entering crop mode
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    mode === "crop" ? "bg-card border-primary shadow-sm text-foreground" : "bg-transparent border-transparent text-muted-foreground hover:bg-card/50"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${mode === "crop" ? "bg-primary/10 text-primary" : "bg-secondary"}`}>
                    <Maximize className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs uppercase tracking-wider">Crop to Fill</span>
                    <span className="text-[10px] opacity-70">Zoom in to fill perfectly. Drag to adjust center.</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-auto shrink-0 pt-2">
              <button
                onClick={handleExport}
                disabled={isProcessing}
                className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98] disabled:opacity-50"
              >
                <Download className="w-5 h-5" /> 
                {isProcessing ? "Processing Media..." : "Export Formatted Media"}
              </button>
              <p className="text-center text-[10px] text-muted-foreground mt-3">
                Outputs at full resolution ({currentRatio.w}x{currentRatio.h})
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
