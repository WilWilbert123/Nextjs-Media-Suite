"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, Film, Loader2, Play, Pause, Settings2, Image as ImageIcon, Trash2, Plus, GripVertical } from "lucide-react";

export default function MakerPage() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  
  // Settings
  const [fps, setFps] = React.useState(10);
  const [format, setFormat] = React.useState<'gif' | 'webp'>('gif');
  const [scale, setScale] = React.useState('original');
  const [loop, setLoop] = React.useState(true);
  
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  
  const imageRef = React.useRef<HTMLImageElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { isReady, isProcessing, progress, error, convertImagesToGif } = useMediaEngine();

  // Auto-process on files or settings change
  React.useEffect(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setPreviewUrl(url);
      
      // Clear result if user edits settings so they can re-render
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
        setResultUrl(null);
      }
      
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, fps, format, scale, loop]);

  const handleProcess = async () => {
    if (files.length === 0) return;
    
    // Store current url to revoke later if a new one is made
    const oldUrl = resultUrl;
    
    const url = await convertImagesToGif(files, fps, { format, scale, loop });
    if (url) {
      setResultUrl(url);
      setIsPlaying(true); // reset play state
      if (oldUrl) URL.revokeObjectURL(oldUrl);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    if (newFiles.length === 0) {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (imageRef.current && canvasRef.current) {
        const img = imageRef.current;
        const canvas = canvasRef.current;
        canvas.width = img.naturalWidth || img.clientWidth;
        canvas.height = img.naturalHeight || img.clientHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleAddMore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto p-4 glass-card smooth-show h-[calc(100vh-6rem)]">
      
      <div className="flex flex-col gap-1 text-center items-center shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-1 smooth-shadow">
          <Film className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">GIF Maker Studio</h1>
        <p className="text-sm text-muted-foreground">
          Upload and sequence images into high-quality animated GIFs or WebPs instantly.
        </p>
      </div>

      {!isReady && (
        <div className="flex-1 border border-border/50 rounded-xl bg-card flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium text-sm">Initializing Media Engine...</p>
        </div>
      )}

      {isReady && files.length === 0 && (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <FileUploader
            onFileSelect={(f) => setFiles(Array.isArray(f) ? f : [f])}
            accept="image/png,image/jpeg,image/webp"
            multiple
          />
        </div>
      )}

      {isReady && files.length > 0 && (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 bg-card border border-border/50 rounded-2xl p-4 md:p-6 smooth-shadow">
          
          {/* LEFT: Frame Sequence Editor */}
          <div className="flex-[2] flex flex-col gap-4 min-w-0 h-full relative">
            <div className="flex items-center justify-between border-b border-border/50 pb-3 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" /> Sequence Editor
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary px-2 py-0.5 rounded-full">
                  {files.length} frames
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-4">
                {files.map((file, i) => (
                  <div 
                    key={i} 
                    draggable
                    onDragStart={(e) => {
                      setDraggedIndex(i);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIndex === null || draggedIndex === i) return;
                      const newFiles = [...files];
                      const draggedFile = newFiles[draggedIndex];
                      newFiles.splice(draggedIndex, 1);
                      newFiles.splice(i, 0, draggedFile);
                      setFiles(newFiles);
                      setDraggedIndex(null);
                    }}
                    onDragEnd={() => setDraggedIndex(null)}
                    className={`aspect-square bg-black/5 rounded-xl border border-border/50 overflow-hidden relative flex items-center justify-center cursor-move transition-all group ${draggedIndex === i ? 'opacity-50 ring-2 ring-primary scale-95' : 'opacity-100 hover:ring-2 hover:ring-primary/50 smooth-shadow'}`}
                  >
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover pointer-events-none" alt={`Frame ${i+1}`} />
                    
                    {/* Badge Number */}
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none">
                      {i+1}
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity">
                      <GripVertical className="w-6 h-6 text-foreground/50 cursor-move" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        className="p-1.5 bg-destructive/10 text-destructive rounded-md hover:bg-destructive hover:text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Add More Button */}
                <div className="aspect-square bg-secondary/30 rounded-xl border border-dashed border-border/50 flex flex-col items-center justify-center gap-2 hover:bg-secondary/60 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border/50 group-hover:scale-110 transition-transform">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Add Frame</span>
                  <input type="file" ref={fileInputRef} onChange={handleAddMore} accept="image/*" multiple className="hidden" />
                </div>

              </div>
            </div>
            {error && (
              <p className="text-xs text-destructive text-center p-2 bg-destructive/10 rounded-lg shrink-0">
                {error}
              </p>
            )}
          </div>

          {/* RIGHT: Preview & Export */}
          <div className="flex-[2] flex flex-col gap-4 min-w-0 h-full overflow-y-auto pr-1 custom-scrollbar">
            
            {/* Live Render Window */}
            <div className="w-full h-64 bg-black/5 border border-border/50 rounded-xl relative flex items-center justify-center overflow-hidden shrink-0 group smooth-shadow pattern-dots">
              {isProcessing && (
                <div className="absolute top-2 left-2 z-50 bg-background/80 backdrop-blur-md px-2 py-1 rounded-full border border-border/50 flex items-center gap-1.5 shadow-sm">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
              )}

              {(resultUrl || previewUrl) && (
                <div className="w-full h-full relative cursor-pointer" onClick={togglePlay}>
                  <img 
                    ref={imageRef}
                    src={resultUrl || previewUrl!} 
                    alt="Output Preview" 
                    className={`w-full h-full object-contain p-2 ${isPlaying ? 'block' : 'hidden'}`} 
                  />
                  <canvas 
                    ref={canvasRef} 
                    className={`w-full h-full object-contain p-2 ${!isPlaying ? 'block' : 'hidden'}`} 
                  />
                  
                  <div className={`absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity ${!isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isPlaying ? (
                      <div className="bg-black/50 p-3 rounded-full backdrop-blur-md shadow-lg scale-90 group-hover:scale-100 transition-transform">
                        <Pause className="w-6 h-6 text-white" fill="currentColor" />
                      </div>
                    ) : (
                      <div className="bg-black/50 p-3 rounded-full backdrop-blur-md shadow-lg scale-100 transition-transform">
                        <Play className="w-6 h-6 text-white" fill="currentColor" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Settings2 className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Output Settings</h3>
              </div>

              {/* Format */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Export Format</label>
                <div className="flex gap-2">
                  <button onClick={() => setFormat('gif')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${format === 'gif' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background hover:bg-card border-border/50 text-muted-foreground'}`}>.GIF (Classic)</button>
                  <button onClick={() => setFormat('webp')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${format === 'webp' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background hover:bg-card border-border/50 text-muted-foreground'}`}>.WEBP (Modern)</button>
                </div>
              </div>

              {/* Speed (FPS) */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Animation Speed</label>
                  <span className="text-[10px] font-mono bg-background px-2 py-0.5 rounded border border-border">{fps} FPS</span>
                </div>
                <input 
                  type="range" min="1" max="30" value={fps} 
                  onChange={(e) => setFps(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* Scale */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quality / Scale</label>
                <select 
                  value={scale} 
                  onChange={(e) => setScale(e.target.value)} 
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="original">Original Size (Highest Quality)</option>
                  <option value="720">Max 720p (Good Quality)</option>
                  <option value="480">Max 480p (Standard GIF)</option>
                  <option value="240">Max 240p (Smallest File Size)</option>
                </select>
              </div>

              {/* Infinite Loop */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Infinite Loop</label>
                <button 
                  onClick={() => setLoop(!loop)} 
                  className={`w-10 h-5 rounded-full relative transition-colors shadow-inner ${loop ? 'bg-primary' : 'bg-secondary border border-border/50'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 bg-background w-4 h-4 rounded-full shadow-sm transition-transform ${loop ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

            </div>

            <div className="mt-auto shrink-0 pt-2 flex flex-col gap-3">
              {!resultUrl ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => { setFiles([]); setResultUrl(null); }}
                    className="flex-1 py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm bg-secondary text-foreground hover:bg-secondary/70 active:scale-[0.98]"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="flex-[2] py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md bg-primary text-primary-foreground hover:opacity-90 active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Film className="w-5 h-5" />}
                    {isProcessing ? "Rendering..." : "Apply & Render"}
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => { setFiles([]); setResultUrl(null); }}
                    className="flex-1 py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm bg-secondary text-foreground hover:bg-secondary/70 active:scale-[0.98]"
                  >
                    Clear All
                  </button>
                  <a
                    href={resultUrl}
                    download={`gifter_${Date.now()}.${format}`}
                    className="flex-[2] py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]"
                  >
                    <Download className="w-5 h-5" /> 
                    Download File
                  </a>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
