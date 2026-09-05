"use client";

import * as React from "react";
import { Captions, Download, Plus, Trash2, Upload, Settings2, FileText, Code } from "lucide-react";

type Subtitle = {
  id: string;
  start: string;
  end: string;
  text: string;
};

type Format = "srt" | "vtt";

// Helper: Parse HH:MM:SS,MMM or HH:MM:SS.MMM to milliseconds
function parseTimeToMs(timeStr: string): number {
  const match = timeStr.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;
  const [_, h, m, s, ms] = match;
  return parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms);
}

// Helper: Format milliseconds to HH:MM:SS,MMM (SRT) or HH:MM:SS.MMM (VTT)
function formatMsToTime(ms: number, isVtt: boolean): string {
  const h = Math.floor(ms / 3600000);
  ms %= 3600000;
  const m = Math.floor(ms / 60000);
  ms %= 60000;
  const s = Math.floor(ms / 1000);
  const msec = ms % 1000;
  
  const pad = (num: number, size: number) => num.toString().padStart(size, '0');
  const sep = isVtt ? '.' : ',';
  
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}${sep}${pad(msec, 3)}`;
}

export default function SubtitlesPage() {
  const [format, setFormat] = React.useState<Format>("srt");
  const [subs, setSubs] = React.useState<Subtitle[]>([
    { id: "1", start: "00:00:01,000", end: "00:00:04,000", text: "Welcome to my video!" }
  ]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-calculate next timecode based on the last line
  const addSub = () => {
    let nextStartMs = 0;
    if (subs.length > 0) {
      const lastSub = subs[subs.length - 1];
      nextStartMs = parseTimeToMs(lastSub.end);
    }
    
    // Add 2 seconds for the default duration
    const nextEndMs = nextStartMs + 2000;
    
    setSubs([...subs, { 
      id: Math.random().toString(), 
      start: formatMsToTime(nextStartMs, format === 'vtt'), 
      end: formatMsToTime(nextEndMs, format === 'vtt'), 
      text: "" 
    }]);
  };

  const removeSub = (id: string) => {
    setSubs(subs.filter(s => s.id !== id));
  };

  const updateSub = (id: string, field: keyof Subtitle, value: string) => {
    setSubs(subs.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Convert time separators when format changes
  React.useEffect(() => {
    setSubs(prev => prev.map(sub => ({
      ...sub,
      start: sub.start.replace(/[,.]/, format === 'vtt' ? '.' : ','),
      end: sub.end.replace(/[,.]/, format === 'vtt' ? '.' : ',')
    })));
  }, [format]);

  const generateOutput = () => {
    let output = format === "vtt" ? "WEBVTT\n\n" : "";
    subs.forEach((sub, index) => {
      if (format === "srt") {
        output += `${index + 1}\n`;
      } else {
        // VTT can optionally have identifiers
        output += `${index + 1}\n`;
      }
      output += `${sub.start} --> ${sub.end}\n`;
      output += `${sub.text}\n\n`;
    });
    return output.trim();
  };

  const handleDownload = () => {
    const output = generateOutput();
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `captions.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        parseImportedFile(text, file.name);
      }
    };
    reader.readAsText(file);
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseImportedFile = (text: string, filename: string) => {
    // Detect format from filename or content
    if (filename.endsWith('.vtt') || text.trim().startsWith('WEBVTT')) {
      setFormat('vtt');
    } else {
      setFormat('srt');
    }

    const blocks = text.trim().replace(/\r\n/g, '\n').split('\n\n');
    const newSubs: Subtitle[] = [];

    blocks.forEach(block => {
      const lines = block.split('\n');
      
      // Skip WEBVTT header block
      if (lines[0].includes('WEBVTT')) return;

      // Find the timecode line
      let timecodeLineIdx = -1;
      let start = "", end = "";

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
        if (match) {
          timecodeLineIdx = i;
          start = match[1];
          end = match[2];
          break;
        }
      }

      if (timecodeLineIdx !== -1) {
        // Text is everything after the timecode line
        const subText = lines.slice(timecodeLineIdx + 1).join('\n');
        newSubs.push({
          id: Math.random().toString(),
          start,
          end,
          text: subText
        });
      }
    });

    if (newSubs.length > 0) {
      setSubs(newSubs);
    } else {
      alert("Could not detect any valid subtitle blocks in this file.");
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto p-4 glass-card smooth-show h-[calc(100vh-6rem)]">
      <div className="flex flex-col gap-1 text-center items-center shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-1 smooth-shadow">
          <Captions className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Subtitle & Caption Studio</h1>
        <p className="text-sm text-muted-foreground">
          Import, edit, and generate professional .SRT and .VTT subtitle files for video content.
        </p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 bg-card border border-border/50 rounded-2xl p-4 md:p-6 smooth-shadow">
        
        {/* LEFT: Editor Panel */}
        <div className="flex-[3] flex flex-col gap-4 min-w-0 h-full relative">
          
          <div className="flex items-center justify-between border-b border-border/50 pb-3 shrink-0">
            <h3 className="font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Editor
            </h3>
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImport} 
                accept=".srt,.vtt,text/plain" 
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-bold hover:bg-secondary/70 transition-colors shadow-sm border border-border/50"
              >
                <Upload className="w-3.5 h-3.5" /> Import File
              </button>
            </div>
          </div>

          {/* Subtitle List */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-2 custom-scrollbar pb-4">
            {subs.map((sub, index) => (
              <div key={sub.id} className="flex flex-col gap-3 p-4 bg-background/50 rounded-xl border border-border/50 smooth-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider bg-secondary px-2 py-0.5 rounded-full">
                    Line {index + 1}
                  </span>
                  <button 
                    onClick={() => removeSub(sub.id)} 
                    className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors"
                    title="Delete Line"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Start Time</label>
                    <input 
                      type="text" 
                      value={sub.start} 
                      onChange={(e) => updateSub(sub.id, "start", e.target.value)}
                      placeholder={format === 'vtt' ? "00:00:00.000" : "00:00:00,000"}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-border/50 bg-background focus:ring-1 focus:ring-primary/50 outline-none"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">End Time</label>
                    <input 
                      type="text" 
                      value={sub.end} 
                      onChange={(e) => updateSub(sub.id, "end", e.target.value)}
                      placeholder={format === 'vtt' ? "00:00:00.000" : "00:00:00,000"}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-border/50 bg-background focus:ring-1 focus:ring-primary/50 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Caption Text</label>
                  <textarea 
                    value={sub.text} 
                    onChange={(e) => updateSub(sub.id, "text", e.target.value)}
                    placeholder="Enter subtitle text here..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border/50 bg-background min-h-[60px] resize-y focus:ring-1 focus:ring-primary/50 outline-none"
                  />
                </div>
              </div>
            ))}
            
            {subs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-60">
                <Captions className="w-8 h-8 mb-2" />
                <p className="text-sm">No captions yet.</p>
                <p className="text-xs">Click "Add Line" or import a file.</p>
              </div>
            )}
            
            <button
              onClick={addSub}
              className="flex items-center justify-center gap-2 py-3 bg-secondary/30 text-foreground border border-dashed border-border rounded-xl text-sm font-bold hover:bg-secondary/50 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Next Line
            </button>
          </div>
          
        </div>

        {/* RIGHT: Preview & Export Panel */}
        <div className="flex-[2] flex flex-col gap-4 min-w-0 h-full">
          <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50 h-full">
            
            <div className="flex items-center justify-between border-b border-border/50 pb-3 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" /> Live Preview
              </h3>
              
              <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border/50">
                <button
                  onClick={() => setFormat("srt")}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                    format === "srt" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  .SRT
                </button>
                <button
                  onClick={() => setFormat("vtt")}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                    format === "vtt" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  .VTT
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative border border-border/50 rounded-xl overflow-hidden smooth-shadow bg-black/5">
              <textarea
                readOnly
                value={generateOutput()}
                className="w-full h-full p-4 font-mono text-[11px] text-muted-foreground resize-none focus:outline-none bg-transparent"
              />
            </div>

            <button
              onClick={handleDownload}
              disabled={subs.length === 0}
              className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98] disabled:opacity-50 shrink-0"
            >
              <Download className="w-5 h-5" /> 
              Export {format.toUpperCase()} File
            </button>
            
          </div>
        </div>

      </div>
    </div>
  );
}
