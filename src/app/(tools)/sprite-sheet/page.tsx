"use client";

import * as React from "react";
import { Grid, Loader2, LayoutGrid, Ruler, Film, Download, RefreshCw, Settings2, Image as ImageIcon } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";

export default function SpriteSheetPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);
  
  const [columns, setColumns] = React.useState<number>(5);
  const [rows, setRows] = React.useState<number>(5);
  const [frameWidth, setFrameWidth] = React.useState<number>(256);
  const [fps, setFps] = React.useState<number>(10);
  
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const { isReady, isProcessing, progress, error, engine } = useMediaEngine();
  
  const lastProcessedRef = React.useRef("");

  const handleFileSelect = (f: File | File[]) => {
    const selected = Array.isArray(f) ? f[0] : f;
    setFile(selected);
    setFileUrl(URL.createObjectURL(selected));
    setResultUrl(null);
    lastProcessedRef.current = "";
  };

  const handleProcess = React.useCallback(async () => {
    if (!file || !engine.current) return;
    
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const outputName = 'spritesheet.png';
      
      const fileData = await file.arrayBuffer();
      await engine.current.writeFile('input.' + ext, new Uint8Array(fileData));
      
      const command = [
        '-i', 'input.' + ext,
        '-frames:v', '1',
        '-q:v', '2',
        '-vf', `fps=${fps},scale=${frameWidth}:-1,tile=${columns}x${rows}`,
        outputName
      ];
      
      await engine.current.exec(command);
      
      const data = await engine.current.readFile(outputName);
      const blob = new Blob([data], { type: 'image/png' });
      setResultUrl(URL.createObjectURL(blob));
      
    } catch (err: any) {
      console.error(err);
    }
  }, [file, engine, fps, frameWidth, columns, rows]);

  React.useEffect(() => {
    if (!file || !engine.current || !isReady) return;

    const currentSettings = `${file.name}-${columns}-${rows}-${frameWidth}-${fps}`;
    if (lastProcessedRef.current === currentSettings) return;

    const timer = setTimeout(() => {
      if (!isProcessing) {
        lastProcessedRef.current = currentSettings;
        handleProcess();
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [file, columns, rows, frameWidth, fps, isReady, isProcessing, handleProcess]);

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setResultUrl(null);
    setFileUrl(null);
    setFile(null);
    lastProcessedRef.current = "";
  };

  const isVideo = file?.type.startsWith("video/");

  return (
    <div className="flex flex-col gap-3 w-full max-w-[1400px] mx-auto p-4 glass-card smooth-show lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
      
      {/* Header (Compact) */}
      <div className="flex flex-col items-center text-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center smooth-shadow">
            <Grid className="w-5 h-5 text-foreground" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Sprite Sheet Generator
          </h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Convert videos and GIFs into high-quality PNG sprite sheets.
        </p>
      </div>

      {!isReady && (
        <div className="flex-1 border border-border rounded-2xl bg-card flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Initializing WebAssembly Engine...</p>
        </div>
      )}

      {isReady && !file && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-full max-w-2xl">
            <FileUploader
              onFileSelect={handleFileSelect}
              accept="video/*,image/gif"
              description="Drag and drop a Video or GIF here"
            />
          </div>
        </div>
      )}

      {file && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-4 mt-2 flex-1 min-h-0 overflow-hidden">
          
          {/* Left Column: Source & Controls (Scrollable if needed on small screens, fits on large) */}
          <div className="flex flex-col gap-4 lg:overflow-y-auto scrollbar-thin lg:pr-2">
            
            {/* Source Preview */}
            <div className="border border-border/50 rounded-xl bg-secondary/20 p-3 smooth-shadow shrink-0">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Film className="w-4 h-4 text-primary" /> Source Media
                </h2>
                <button
                  onClick={handleReset}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  disabled={isProcessing}
                >
                  <RefreshCw className="w-3 h-3" /> Change
                </button>
              </div>
              <div className="w-full bg-black/5 rounded-lg overflow-hidden flex items-center justify-center aspect-video border border-border/40 relative max-h-[160px]">
                {fileUrl && isVideo ? (
                  <video src={fileUrl} className="w-full h-full object-contain" controls loop muted autoPlay />
                ) : fileUrl ? (
                  <img src={fileUrl} className="w-full h-full object-contain" alt="Source" />
                ) : null}
              </div>
            </div>

            {/* Settings */}
            <div className="flex flex-col gap-4 border border-border/50 rounded-xl bg-card p-4 smooth-shadow relative shrink-0">
              <h2 className="text-base font-bold flex items-center gap-2 border-b border-border/40 pb-2">
                <Settings2 className="w-4 h-4 text-primary" /> Settings
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 bg-background p-2.5 rounded-lg border border-border/40">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-primary" /> Columns
                  </label>
                  <input
                    type="number"
                    min={1} max={50}
                    value={columns}
                    onChange={(e) => setColumns(Number(e.target.value))}
                    className="w-full h-8 px-2 text-sm rounded-md border border-border bg-card focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5 bg-background p-2.5 rounded-lg border border-border/40">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-primary rotate-90" /> Rows
                  </label>
                  <input
                    type="number"
                    min={1} max={50}
                    value={rows}
                    onChange={(e) => setRows(Number(e.target.value))}
                    className="w-full h-8 px-2 text-sm rounded-md border border-border bg-card focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 bg-background p-2.5 rounded-lg border border-border/40">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-primary" /> Width (px)
                  </label>
                  <input
                    type="number"
                    min={10} max={2000} step={10}
                    value={frameWidth}
                    onChange={(e) => setFrameWidth(Number(e.target.value))}
                    className="w-full h-8 px-2 text-sm rounded-md border border-border bg-card focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5 bg-background p-2.5 rounded-lg border border-border/40">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-primary" /> FPS
                  </label>
                  <input
                    type="number"
                    min={1} max={60}
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="w-full h-8 px-2 text-sm rounded-md border border-border bg-card focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
              </div>
              
              <div className="bg-secondary/30 p-2 rounded-lg text-xs text-muted-foreground flex items-center gap-2 border border-border/40 mt-1">
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                Single {columns * frameWidth}px wide PNG ({columns * rows} frames).
              </div>
              
              {isProcessing && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
                  <div className="bg-card p-2 px-3 rounded-lg border border-border/50 shadow-md flex items-center gap-2">
                     <Loader2 className="w-4 h-4 animate-spin text-primary" />
                     <span className="font-semibold text-xs">Processing... {Math.round(progress * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Result (Takes full remaining height) */}
          <div className="flex flex-col gap-3 border border-border/50 rounded-xl bg-card p-4 smooth-shadow min-h-[400px] lg:min-h-0 h-full overflow-hidden">
            <h2 className="text-base font-bold flex items-center gap-2 border-b border-border/40 pb-2 shrink-0">
              <ImageIcon className="w-4 h-4 text-primary" /> Live Sprite Sheet Preview
            </h2>
            
            <div className="flex-1 min-h-0 bg-black/5 rounded-lg flex items-center justify-center p-3 border border-border/40 relative pattern-dots overflow-hidden">
              {resultUrl ? (
                <img 
                  src={resultUrl} 
                  alt="Sprite Sheet Preview" 
                  className={`max-w-full max-h-full object-contain shadow-xl border border-primary/20 bg-white transition-opacity duration-300 ${isProcessing ? 'opacity-50' : 'opacity-100'}`} 
                />
              ) : error ? (
                <div className="m-auto text-destructive text-center max-w-sm">
                   <p className="font-semibold mb-1 text-sm">Failed to generate</p>
                   <p className="text-xs opacity-80">{error}</p>
                </div>
              ) : (
                <div className="m-auto text-muted-foreground flex items-center gap-2 text-sm">
                   {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                   Waiting for preview...
                </div>
              )}
            </div>
            
            <a
              href={resultUrl || "#"}
              download={resultUrl ? `spritesheet_${columns}x${rows}_${Date.now()}.png` : undefined}
              className={`shrink-0 flex items-center justify-center gap-2 py-3 rounded-xl bg-foreground text-background font-bold text-sm transition-all shadow-md ${!resultUrl || isProcessing ? 'opacity-50 pointer-events-none' : 'hover:bg-foreground/90 active:scale-[0.98]'}`}
            >
              <Download className="w-4 h-4" /> Download Sprite Sheet
            </a>
          </div>

        </div>
      )}
    </div>
  );
}
