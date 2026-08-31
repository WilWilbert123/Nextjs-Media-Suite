"use client";

import * as React from "react";
import { Captions, Download, Plus, Trash2 } from "lucide-react";

type Subtitle = {
  id: string;
  start: string;
  end: string;
  text: string;
};

export default function SubtitlesPage() {
  const [subs, setSubs] = React.useState<Subtitle[]>([
    { id: "1", start: "00:00:01,000", end: "00:00:04,000", text: "Welcome to my video!" }
  ]);

  const addSub = () => {
    setSubs([...subs, { id: Math.random().toString(), start: "00:00:00,000", end: "00:00:00,000", text: "" }]);
  };

  const removeSub = (id: string) => {
    setSubs(subs.filter(s => s.id !== id));
  };

  const updateSub = (id: string, field: keyof Subtitle, value: string) => {
    setSubs(subs.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const generateSRT = () => {
    let srt = "";
    subs.forEach((sub, index) => {
      srt += `${index + 1}\n`;
      srt += `${sub.start} --> ${sub.end}\n`;
      srt += `${sub.text}\n\n`;
    });
    return srt;
  };

  const handleDownload = () => {
    const srt = generateSRT();
    const blob = new Blob([srt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "captions.srt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Captions className="w-8 h-8 text-primary" />
          Subtitle & Caption Generator
        </h1>
        <p className="text-muted-foreground">
          Create standard .SRT subtitle files for YouTube, TikTok, and video editors.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4 border border-border rounded-xl bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Caption Lines</h3>
            <button
              onClick={addSub}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Line
            </button>
          </div>

          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2">
            {subs.map((sub, index) => (
              <div key={sub.id} className="flex flex-col gap-3 p-4 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Line {index + 1}</span>
                  <button onClick={() => removeSub(sub.id)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-xs font-medium">Start Time</label>
                    <input 
                      type="text" 
                      value={sub.start} 
                      onChange={(e) => updateSub(sub.id, "start", e.target.value)}
                      placeholder="00:00:00,000"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-xs font-medium">End Time</label>
                    <input 
                      type="text" 
                      value={sub.end} 
                      onChange={(e) => updateSub(sub.id, "end", e.target.value)}
                      placeholder="00:00:00,000"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">Caption Text</label>
                  <textarea 
                    value={sub.text} 
                    onChange={(e) => updateSub(sub.id, "text", e.target.value)}
                    placeholder="Enter subtitle text here..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background min-h-[60px] resize-y"
                  />
                </div>
              </div>
            ))}
            
            {subs.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                No captions yet. Click "Add Line" to start.
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 w-full md:w-80">
          <div className="flex flex-col gap-4 border border-border rounded-xl bg-card p-6 h-full">
            <h3 className="font-semibold text-lg">Preview (.SRT Format)</h3>
            <textarea
              readOnly
              value={generateSRT()}
              className="w-full flex-1 min-h-[300px] p-4 rounded-xl border border-border bg-black/5 font-mono text-xs text-muted-foreground resize-none focus:outline-none"
            />
            <button
              onClick={handleDownload}
              disabled={subs.length === 0}
              className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 w-full mt-auto"
            >
              <Download className="w-5 h-5" /> Download .SRT File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
