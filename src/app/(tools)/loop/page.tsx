"use client";

import * as React from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";

export default function LoopPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const { isReady, isProcessing, progress, error, engine } = useMediaEngine();

  const handleProcess = async () => {
    if (!file || !engine.current) return;
    
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const outputName = 'loop_output.' + ext;
      
      const fileData = await file.arrayBuffer();
      await engine.current.writeFile('input.' + ext, new Uint8Array(fileData));
      
      // Ping-pong loop (forward then backward)
      const command = [
        '-i', 'input.' + ext,
        '-filter_complex', '[0:v]reverse[r];[0:v][r]concat=n=2:v=1:a=0',
        outputName
      ];
      
      await engine.current.exec(command);
      
      const data = await engine.current.readFile(outputName);
      const blob = new Blob([data], { type: ext === 'gif' ? 'image/gif' : 'video/mp4' });
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
          <RefreshCw className="w-8 h-8 text-primary" />
          Seamless Loop Seamer
        </h1>
        <p className="text-muted-foreground">
          Create perfectly smooth ping-pong (boomerang) loops for GIFs and videos.
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
            <div className="flex-1 bg-black/5 rounded-lg flex items-center justify-center p-4 min-h-[200px]">
              <video src={URL.createObjectURL(file)} autoPlay loop muted className="max-h-[30vh] object-contain rounded-lg shadow-lg" />
            </div>

            <div className="flex flex-col gap-4 justify-center w-full md:w-64">
              <p className="text-sm text-muted-foreground">
                This tool uses a "Ping-Pong" technique. It plays your video forward, and then immediately plays it in reverse, ensuring the loop is 100% seamless without jarring cuts.
              </p>
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 mt-4"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Seaming... {Math.round(progress * 100)}%</>
                ) : "Create Seamless Loop"}
              </button>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </div>
          </div>
        </div>
      )}

      {resultUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="w-full bg-black/5 overflow-auto rounded-lg flex items-center justify-center p-4 min-h-[300px]">
            {file?.type.includes("video") ? (
              <video src={resultUrl} autoPlay loop controls className="max-h-[50vh] shadow-lg rounded-lg" />
            ) : (
              <img src={resultUrl} alt="Looped GIF" className="max-h-[50vh] shadow-lg rounded-lg" />
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`loop_${Date.now()}.${file?.name.split('.').pop()}`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
            >
              Download Looped Media
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
