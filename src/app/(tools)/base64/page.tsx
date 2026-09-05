"use client";

import * as React from "react";
import { Binary, Loader2, Copy, Check, FileDown, Code, FileText, Download, AlertCircle, Image as ImageIcon } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";

export default function Base64Page() {
  const [mode, setMode] = React.useState<"encode" | "decode">("encode");
  
  // Encode State
  const [file, setFile] = React.useState<File | null>(null);
  const [base64, setBase64] = React.useState<string>("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const [copiedRaw, setCopiedRaw] = React.useState(false);
  const [copiedCss, setCopiedCss] = React.useState(false);
  const [copiedHtml, setCopiedHtml] = React.useState(false);

  // Decode State
  const [decodeInput, setDecodeInput] = React.useState("");
  const [decodeMime, setDecodeMime] = React.useState<string | null>(null);
  const [decodeError, setDecodeError] = React.useState<string | null>(null);

  // --- ENCODE LOGIC ---
  React.useEffect(() => {
    if (file && mode === "encode") {
      encodeFile(file);
    } else {
      setBase64("");
    }
  }, [file, mode]);

  const encodeFile = (f: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setBase64(reader.result);
      }
      setIsProcessing(false);
    };
    reader.readAsDataURL(f);
  };

  const handleCopy = (text: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const downloadText = (content: string, filename: string) => {
    const a = document.createElement("a");
    const blob = new Blob([content], { type: "text/plain" });
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // --- DECODE LOGIC ---
  React.useEffect(() => {
    if (mode !== "decode") return;
    if (!decodeInput.trim()) {
      setDecodeMime(null);
      setDecodeError(null);
      return;
    }

    try {
      // Very basic validation for Data URI
      let mime = "";
      let data = decodeInput;

      if (decodeInput.startsWith("data:")) {
        const parts = decodeInput.split(",");
        if (parts.length !== 2) throw new Error("Invalid Data URI format");
        const match = parts[0].match(/data:(.*?);base64/);
        if (!match) throw new Error("Not a base64 Data URI");
        mime = match[1];
        data = parts[1];
      } else {
        // Assume raw base64, try to guess if possible or default to octet-stream
        mime = "application/octet-stream";
      }

      // Check if it's valid base64
      // This regex checks for valid base64 characters. 
      // It's a simple check so it doesn't hang on massive strings.
      if (!/^[A-Za-z0-9+/=]+$/.test(data.replace(/\s/g, ''))) {
         throw new Error("Contains invalid Base64 characters");
      }

      setDecodeMime(mime);
      setDecodeError(null);
    } catch (err: any) {
      setDecodeMime(null);
      setDecodeError(err.message || "Invalid Base64 string");
    }
  }, [decodeInput, mode]);

  const handleDownloadDecoded = () => {
    if (!decodeInput || decodeError) return;
    
    try {
      let data = decodeInput;
      let mime = decodeMime || "application/octet-stream";
      
      if (decodeInput.startsWith("data:")) {
        data = decodeInput.split(",")[1];
      }

      const byteString = atob(data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mime });
      
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      
      // Try to guess extension
      let ext = "bin";
      if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
      else if (mime.includes("png")) ext = "png";
      else if (mime.includes("gif")) ext = "gif";
      else if (mime.includes("svg")) ext = "svg";
      else if (mime.includes("webp")) ext = "webp";
      else if (mime.includes("mp4")) ext = "mp4";
      else if (mime.includes("webm")) ext = "webm";
      else if (mime.includes("mp3") || mime.includes("mpeg")) ext = "mp3";
      else if (mime.includes("wav")) ext = "wav";
      else if (mime.includes("pdf")) ext = "pdf";
      else if (mime.includes("text/plain")) ext = "txt";

      a.download = `decoded_file.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert("Failed to decode file. The string might be malformed or too large.");
    }
  };

  const isDecodedImage = decodeMime?.startsWith("image/");
  const isDecodedVideo = decodeMime?.startsWith("video/");
  const isDecodedAudio = decodeMime?.startsWith("audio/");
  const previewSrc = decodeInput.startsWith("data:") ? decodeInput : `data:${decodeMime || "application/octet-stream"};base64,${decodeInput}`;

  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto p-4 glass-card smooth-show h-[calc(100vh-6rem)]">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-2 smooth-shadow">
          <Binary className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Base64 Studio
        </h1>
        <p className="text-muted-foreground max-w-lg">
          Encode media into Base64 Data URIs, or decode strings back into raw files. Everything runs securely in your browser.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex bg-secondary p-1 rounded-xl max-w-xs mx-auto w-full mb-2 smooth-shadow border border-border/50">
        <button
          onClick={() => setMode("encode")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            mode === "encode" ? "bg-background text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Encode File
        </button>
        <button
          onClick={() => setMode("decode")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            mode === "decode" ? "bg-background text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Decode String
        </button>
      </div>

      <div className="flex-1 w-full bg-card rounded-2xl border border-border/50 smooth-shadow p-4 md:p-6 min-h-0">
        
        {/* ======================= ENCODE MODE ======================= */}
        {mode === "encode" && (
          <div className="flex flex-col gap-6 h-full">
            {!file && (
              <div className="flex-1 flex items-center justify-center min-h-[300px]">
                <FileUploader
                  onFileSelect={(f) => setFile(Array.isArray(f) ? f[0] : f)}
                />
              </div>
            )}

            {file && (
              <div className="flex flex-col gap-6 h-full">
                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                  <div>
                    <p className="font-bold">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-4"
                  >
                    Change File
                  </button>
                </div>

                {isProcessing ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground min-h-[200px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" /> 
                    <span className="font-medium">Encoding to Base64...</span>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                    {/* Left: Base64 output */}
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-bold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" /> Raw Base64 Data URI
                      </label>
                      <div className="relative flex-1 min-h-[250px] flex flex-col border border-border/50 rounded-xl overflow-hidden smooth-shadow">
                        <textarea
                          readOnly
                          value={base64}
                          className="flex-1 w-full p-4 bg-background/50 font-mono text-[11px] text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <div className="bg-secondary/50 p-3 flex justify-between items-center border-t border-border/50">
                          <span className="text-xs font-medium text-muted-foreground">
                            Size: {(base64.length / 1024).toFixed(1)} KB
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => downloadText(base64, `${file.name}.base64.txt`)}
                              className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold bg-card border border-border rounded-lg hover:bg-secondary transition-colors"
                            >
                              <FileDown className="w-3.5 h-3.5" /> Save .txt
                            </button>
                            <button
                              onClick={() => handleCopy(base64, setCopiedRaw)}
                              className="px-4 py-1.5 flex items-center gap-1.5 text-xs font-bold bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors shadow-sm"
                            >
                              {copiedRaw ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedRaw ? "Copied" : "Copy Raw"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Code Snippets */}
                    <div className="w-full lg:w-80 flex flex-col gap-5">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold flex items-center gap-2">
                          <Code className="w-4 h-4 text-primary" /> CSS Background
                        </label>
                        <div className="relative border border-border/50 rounded-xl overflow-hidden smooth-shadow">
                          <textarea
                            readOnly
                            value={`background-image: url('${base64.substring(0, 50)}...');`}
                            className="w-full h-20 p-3 bg-background/50 font-mono text-xs text-muted-foreground resize-none focus:outline-none"
                          />
                          <button
                            onClick={() => handleCopy(`background-image: url('${base64}');`, setCopiedCss)}
                            className="absolute bottom-2 right-2 px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                          >
                            {copiedCss ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiedCss ? "Copied" : "Copy CSS"}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold flex items-center gap-2">
                          <Code className="w-4 h-4 text-primary" /> HTML Image Tag
                        </label>
                        <div className="relative border border-border/50 rounded-xl overflow-hidden smooth-shadow">
                          <textarea
                            readOnly
                            value={`<img src="${base64.substring(0, 50)}..." alt="Base64" />`}
                            className="w-full h-20 p-3 bg-background/50 font-mono text-xs text-muted-foreground resize-none focus:outline-none"
                          />
                          <button
                            onClick={() => handleCopy(`<img src="${base64}" alt="Base64 encoded image" />`, setCopiedHtml)}
                            className="absolute bottom-2 right-2 px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                          >
                            {copiedHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiedHtml ? "Copied" : "Copy HTML"}
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================= DECODE MODE ======================= */}
        {mode === "decode" && (
          <div className="flex flex-col lg:flex-row gap-4 h-full">
            
            {/* Input Side */}
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Paste Base64 String
              </label>
              <textarea
                value={decodeInput}
                onChange={(e) => setDecodeInput(e.target.value)}
                placeholder="Paste a base64 string or Data URI here (e.g., data:image/png;base64,iVBORw0KGgo...)"
                className="flex-1 w-full p-4 rounded-xl border border-border/50 bg-background focus:ring-2 focus:ring-primary/50 outline-none font-mono text-sm resize-none smooth-shadow min-h-0"
              />
              {decodeInput.length > 0 && !decodeError && (
                <p className="text-xs text-muted-foreground mt-1 ml-1 flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500" /> Valid string format detected
                </p>
              )}
            </div>

            {/* Analysis & Output Side */}
            <div className="w-full lg:w-96 flex flex-col gap-4">
              <label className="text-sm font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" /> Decoder Result
              </label>
              
              <div className="flex-1 bg-secondary/30 rounded-xl border border-border/50 p-4 flex flex-col gap-4 smooth-shadow relative overflow-hidden">
                {!decodeInput ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground opacity-60 m-auto">
                    <Binary className="w-8 h-8" />
                    <p className="text-sm">Waiting for input...</p>
                  </div>
                ) : decodeError ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-destructive m-auto max-w-[200px]">
                    <AlertCircle className="w-8 h-8" />
                    <p className="text-sm font-bold">Invalid Base64</p>
                    <p className="text-xs opacity-80">{decodeError}</p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full gap-4">
                    
                    <div className="flex flex-col gap-1 p-3 bg-card rounded-lg border border-border/40 shadow-sm">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Detected Type</p>
                      <p className="text-sm font-mono truncate">{decodeMime || "application/octet-stream"}</p>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 bg-black/5 rounded-lg border border-border/40 flex items-center justify-center p-2 relative pattern-dots overflow-hidden min-h-0">
                      {isDecodedImage ? (
                        <img 
                          src={previewSrc} 
                          alt="Decoded Preview" 
                          className="max-w-full max-h-full object-contain shadow-md"
                        />
                      ) : isDecodedVideo ? (
                        <video 
                          src={previewSrc} 
                          controls
                          className="max-w-full max-h-full object-contain shadow-md rounded"
                        />
                      ) : isDecodedAudio ? (
                        <audio 
                          src={previewSrc} 
                          controls
                          className="w-full px-2"
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground">No visual preview available for this file type.</p>
                      )}
                    </div>

                    <button
                      onClick={handleDownloadDecoded}
                      className="w-full py-3.5 flex items-center justify-center gap-2 text-sm font-bold bg-foreground text-background rounded-xl hover:bg-foreground/90 transition-all shadow-md mt-auto active:scale-[0.98]"
                    >
                      <Download className="w-4 h-4" /> Download Decoded File
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
