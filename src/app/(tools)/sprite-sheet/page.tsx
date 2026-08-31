"use client";

import * as React from "react";
import { Grid, Loader2 } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";

export default function SpriteSheetPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [gridSize, setGridSize] = React.useState<number>(5);
  const [frameSkip, setFrameSkip] = React.useState<number>(10);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  
  const { isReady, isProcessing, progress, error, engine } = useMediaEngine();

  const handleProcess = async () => {
    if (!file || !engine.current) return;
    
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const outputName = 'spritesheet.png';
      
      const fileData = await file.arrayBuffer();
      await engine.current.writeFile('input.' + ext, new Uint8Array(fileData));
      
      // select every Nth frame, scale to 200px width, tile it, and output 1 frame.
      const command = [
        '-i', 'input.' + ext,
        '-vframes', '1',
        '-q:v', '2',
        '-vf', `select=not(mod(n\\,${frameSkip})),scale=200:-1,tile=${gridSize}x${gridSize}`,
        outputName
      ];
      
      await engine.current.exec(command);
      
      const data = await engine.current.readFile(outputName);
      const blob = new Blob([data], { type: 'image/png' });
      setResultUrl(URL.createObjectURL(blob));
      
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setFile(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Grid className="w-8 h-8 text-primary" />
          Sprite Sheet Generator
        </h1>
        <p className="text-muted-foreground">
          Convert videos and GIFs into high-quality PNG sprite sheets for games and CSS animations.
        </p>
      </div>

      {!isReady && (
        <div className="p-8 border border-border rounded-xl bg-card flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing WebAssembly Engine...</p>
        </div>
      )}

      {isReady && !file && (
        <FileUploader
          onFileSelect={(f) => setFile(f as File)}
          accept="video/*,image/gif"
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

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex flex-col gap-4">
              <label className="text-sm font-medium">Grid Size (Columns x Rows)</label>
              <select 
                value={gridSize} 
                onChange={e => setGridSize(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                disabled={isProcessing}
              >
                <option value={3}>3x3 (9 frames)</option>
                <option value={5}>5x5 (25 frames)</option>
                <option value={8}>8x8 (64 frames)</option>
                <option value={10}>10x10 (100 frames)</option>
              </select>

              <label className="text-sm font-medium mt-2">Frame Skip (Extract every Nth frame)</label>
              <select 
                value={frameSkip} 
                onChange={e => setFrameSkip(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                disabled={isProcessing}
              >
                <option value={1}>Every 1 Frame (Smooth)</option>
                <option value={5}>Every 5 Frames</option>
                <option value={10}>Every 10 Frames</option>
                <option value={30}>Every 30 Frames (Time-lapse)</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-4 justify-center w-full md:w-64 mt-auto">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating... {Math.round(progress * 100)}%</>
                ) : "Create Sprite Sheet"}
              </button>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </div>
          </div>
        </div>
      )}

      {resultUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="w-full bg-black/5 overflow-auto max-h-[60vh] rounded-lg flex items-start justify-center p-4">
            <img src={resultUrl} alt="Sprite Sheet" className="max-w-none shadow-lg border-2 border-primary/20 bg-white" />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`spritesheet_${Date.now()}.png`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
            >
              Download PNG Sprite Sheet
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-secondary/50 active:scale-95 transition-all"
            >
              Create Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
