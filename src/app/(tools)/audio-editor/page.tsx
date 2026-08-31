"use client";

import * as React from "react";
import { AudioLines, Loader2 } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";

export default function AudioEditorPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [speed, setSpeed] = React.useState<number>(1.0);
  const [volume, setVolume] = React.useState<number>(1.0);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  
  const { isReady, isProcessing, progress, error, engine } = useMediaEngine();

  const handleProcess = async () => {
    if (!file || !engine.current) return;
    
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const outputName = 'output.' + ext;
      
      const fileData = await file.arrayBuffer();
      await engine.current.writeFile('input.' + ext, new Uint8Array(fileData));
      
      const command = [
        '-i', 'input.' + ext,
        '-filter:a', `atempo=${speed},volume=${volume}`,
        outputName
      ];
      
      await engine.current.exec(command);
      
      const data = await engine.current.readFile(outputName);
      const blob = new Blob([data], { type: `audio/${ext === 'mp3' ? 'mpeg' : ext}` });
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
          <AudioLines className="w-8 h-8 text-primary" />
          Audio Editor
        </h1>
        <p className="text-muted-foreground">
          Adjust the speed and volume of your audio files directly in your browser.
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
          accept="audio/*,video/*"
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
            <div className="flex-1 flex flex-col gap-6 p-6 bg-black/5 rounded-xl border border-border">
              <div className="flex flex-col gap-3">
                <label className="font-semibold flex justify-between">
                  <span>Playback Speed</span>
                  <span className="text-muted-foreground font-normal">{speed.toFixed(2)}x</span>
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-muted rounded-full appearance-none cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-3">
                <label className="font-semibold flex justify-between">
                  <span>Volume Booster</span>
                  <span className="text-muted-foreground font-normal">{Math.round(volume * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={0.0}
                  max={3.0}
                  step={0.1}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-muted rounded-full appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 justify-center w-full md:w-64">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing... {Math.round(progress * 100)}%</>
                ) : "Process Audio"}
              </button>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </div>
          </div>
        </div>
      )}

      {resultUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="w-full bg-black/5 rounded-lg flex flex-col gap-4 items-center justify-center p-8">
            <audio src={resultUrl} controls className="w-full max-w-md" />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`edited_${Date.now()}.${file?.name.split('.').pop()}`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
            >
              Download Edited Audio
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-secondary/50 active:scale-95 transition-all"
            >
              Edit Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
