"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, RefreshCw, Film, Loader2, Play, Pause } from "lucide-react";

export default function MakerPage() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [fps, setFps] = React.useState(10);
  const [format, setFormat] = React.useState<'gif' | 'webp'>('gif');
  const [scale, setScale] = React.useState('original');
  const [loop, setLoop] = React.useState(true);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  
  const [isPlaying, setIsPlaying] = React.useState(true);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

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
  
  const { isReady, isProcessing, progress, error, convertImagesToGif } = useMediaEngine();

  const handleProcess = async () => {
    if (files.length === 0) return;
    
    const url = await convertImagesToGif(files, fps, { format, scale, loop });
    if (url) {
      setResultUrl(url);
    }
  };

  const handleReset = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setResultUrl(null);
    setFiles([]);
    setFps(10);
    setFormat('gif');
    setScale('original');
    setLoop(true);
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Film className="w-8 h-8 text-primary" />
          GIF Maker
        </h1>
        <p className="text-muted-foreground">
          Upload multiple images to stitch them together into a high-quality animated GIF or WebP.
        </p>
      </div>

      {!isReady && (
        <div className="p-8 border border-border rounded-xl bg-card flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing WebAssembly Media Engine...</p>
        </div>
      )}

      {isReady && files.length === 0 && (
        <FileUploader
          onFileSelect={(f) => setFiles(Array.isArray(f) ? f : [f])}
          accept="image/png,image/jpeg,image/webp"
          multiple
        />
      )}

      {files.length > 0 && !resultUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{files.length} images selected</p>
              <p className="text-sm text-muted-foreground">
                {(files.reduce((acc, curr) => acc + curr.size, 0) / 1024 / 1024).toFixed(2)} MB total
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              disabled={isProcessing}
            >
              Start over
            </button>
          </div>

          {!isProcessing ? (
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 flex flex-col gap-8">
                <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Output Format</label>
                    <div className="flex gap-2">
                      <button onClick={() => setFormat('gif')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors border ${format === 'gif' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'}`}>GIF</button>
                      <button onClick={() => setFormat('webp')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors border ${format === 'webp' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'}`}>WebP</button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Quality / Scale</label>
                    <select value={scale} onChange={(e) => setScale(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary">
                      <option value="original">Original Size</option>
                      <option value="720">Max 720p</option>
                      <option value="480">Max 480p</option>
                      <option value="240">Max 240p</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Infinite Loop</label>
                    <button onClick={() => setLoop(!loop)} className={`w-10 h-5 rounded-full relative transition-colors ${loop ? 'bg-primary' : 'bg-muted'}`}>
                      <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${loop ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t border-border">
                    <label className="text-sm font-medium">Frames Per Second (FPS): {fps}</label>
                    <input 
                      type="range" 
                      min="1" 
                      max="30" 
                      value={fps} 
                      onChange={(e) => setFps(parseInt(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={handleProcess}
                  className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all w-full mt-auto"
                >
                  Generate GIF
                </button>
              </div>

              {/* Live Preview Grid Window */}
              <div className="flex-1 border-2 border-dashed border-border rounded-xl p-4 bg-muted/20 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-10 backdrop-blur-md">
                  Frame Preview ({files.length})
                </div>
                <div className={`grid gap-2 w-full max-h-[400px] overflow-y-auto pr-2 ${files.length === 1 ? 'grid-cols-1' : files.length === 2 ? 'grid-cols-2' : 'grid-cols-3 sm:grid-cols-4'}`}>
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
                      className={`${files.length === 1 ? 'aspect-auto min-h-[200px]' : 'aspect-square'} bg-background rounded border border-border overflow-hidden relative flex items-center justify-center cursor-move transition-all ${draggedIndex === i ? 'opacity-50 ring-2 ring-primary' : 'opacity-100 hover:ring-2 hover:ring-primary/50'}`}
                    >
                      <img src={URL.createObjectURL(file)} className={`w-full h-full pointer-events-none ${files.length === 1 ? 'object-contain' : 'object-cover'}`} alt={`Frame ${i+1}`} />
                      <span className="absolute bottom-1 right-1 text-[10px] font-bold bg-black/50 text-white px-1 rounded pointer-events-none">{i+1}</span>
                    </div>
                  ))}
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
              <p className="text-sm font-medium animate-pulse">Stitching frames locally...</p>
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
          <div 
            className="w-full bg-black/5 rounded-lg overflow-hidden flex items-center justify-center min-h-[200px] h-[50vh] relative group cursor-pointer"
            onClick={togglePlay}
          >
            <img 
              ref={imageRef}
              src={resultUrl} 
              alt="Generated output" 
              className={`max-w-full h-full object-contain ${isPlaying ? 'block' : 'hidden'}`} 
            />
            <canvas 
              ref={canvasRef} 
              className={`max-w-full h-full object-contain ${!isPlaying ? 'block' : 'hidden'}`} 
            />
            
            <div className={`absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity ${!isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {isPlaying ? (
                <div className="bg-black/50 p-4 rounded-full backdrop-blur-sm shadow-lg scale-90 group-hover:scale-100 transition-transform">
                  <Pause className="w-10 h-10 text-white" fill="currentColor" />
                </div>
              ) : (
                <div className="bg-black/50 p-4 rounded-full backdrop-blur-sm shadow-lg scale-100 transition-transform">
                  <Play className="w-10 h-10 text-white" fill="currentColor" />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`gifter_output_${Date.now()}.${format}`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
            >
              <Download className="w-5 h-5" />
              Download {format.toUpperCase()}
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
