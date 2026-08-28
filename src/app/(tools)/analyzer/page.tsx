"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { getFFmpeg } from "@/lib/engines/ffmpeg";
import { RefreshCw, Search, Loader2, Info } from "lucide-react";

export default function AnalyzerToolPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [analysisLogs, setAnalysisLogs] = React.useState<string[]>([]);
  
  const { isReady, isProcessing } = useMediaEngine();

  const handleProcess = async (selectedFile: File) => {
    setFile(selectedFile);
    const ffmpeg = await getFFmpeg();
    if (!ffmpeg) return;
    
    setAnalysisLogs([]);
    const logs: string[] = [];
    
    // Setup temporary log listener just for this analysis
    const logHandler = ({ message }: { message: string }) => {
      logs.push(message);
      setAnalysisLogs([...logs]);
    };
    
    ffmpeg.on("log", logHandler);
    
    try {
      const { fetchFile } = await import("@ffmpeg/util");
      
      // Normalize extension
      let ext = "mp4";
      if (selectedFile.name.toLowerCase().endsWith(".gif")) ext = "gif";
      else if (selectedFile.name.toLowerCase().endsWith(".webm")) ext = "webm";
      else if (selectedFile.type.includes("image")) ext = "png";
      
      const inputName = `analyze_vid.${ext}`;
      await ffmpeg.writeFile(inputName, await fetchFile(selectedFile));
      
      // Run ffmpeg without an output file to force it to dump stream information
      await ffmpeg.exec(["-i", inputName]);
      
    } catch (err: any) {
      console.error(err);
    } finally {
      ffmpeg.off("log", logHandler);
    }
  };

  const handleReset = () => {
    setFile(null);
    setAnalysisLogs([]);
  };

  // Filter logs to just the useful stream/metadata info
  const filteredLogs = analysisLogs.filter(log => 
    log.includes("Duration:") || 
    log.includes("Stream #") || 
    log.includes("Metadata:") ||
    log.includes("encoder")
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Search className="w-8 h-8 text-primary" />
          Deep Analyzer
        </h1>
        <p className="text-muted-foreground">
          Extract advanced technical metadata, codecs, and stream information directly from any media file.
        </p>
      </div>

      {!isReady && (
        <div className="p-8 border border-border rounded-xl bg-card flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing WebAssembly Media Engine...</p>
        </div>
      )}

      {isReady && !file && (
        <FileUploader
          onFileSelect={(f) => handleProcess(f as File)}
          accept="video/*,image/*"
        />
      )}

      {file && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown MIME Type'}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              disabled={isProcessing}
            >
              Analyze different file
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Live Preview Window */}
            <div className="flex-1 border-2 border-dashed border-border rounded-xl p-2 bg-muted/20 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-10 backdrop-blur-md">
                Media
              </div>
              {file.type.includes("video") ? (
                <video 
                  src={URL.createObjectURL(file)} 
                  autoPlay 
                  loop 
                  muted
                  controls
                  className="max-w-full max-h-[300px] object-contain rounded-lg shadow-lg"
                />
              ) : (
                <img 
                  src={URL.createObjectURL(file)} 
                  alt="Preview" 
                  className="max-w-full max-h-[300px] object-contain rounded-lg shadow-lg"
                />
              )}
            </div>

            {/* Analysis Data */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Info className="w-5 h-5" />
                Technical Breakdown
              </div>
              
              {analysisLogs.length === 0 ? (
                <div className="h-full min-h-[200px] flex items-center justify-center text-muted-foreground border border-border rounded-lg bg-muted/30">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Parsing headers...
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-2">
                  <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto border border-border whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log, i) => (
                        <div key={i} className="mb-1 pb-1 border-b border-border/50 last:border-0 text-emerald-400">
                          {log}
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No advanced metadata streams found.</span>
                    )}
                  </div>
                  <div className="bg-black/90 text-zinc-400 p-4 rounded-lg font-mono text-[10px] overflow-x-auto border border-border max-h-[150px] overflow-y-auto">
                    <div className="font-bold text-white mb-2 sticky top-0 bg-black/90">Raw FFmpeg Output</div>
                    {analysisLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
