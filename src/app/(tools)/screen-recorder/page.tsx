"use client";

import * as React from "react";
import { Download, RefreshCw, Monitor, Play, Square, Circle, Mic, Volume2, MousePointer2 } from "lucide-react";

export default function ScreenRecorderPage() {
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordedBlob, setRecordedBlob] = React.useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = React.useState<string | null>(null);
  const [duration, setDuration] = React.useState(0);
  
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const allTracksRef = React.useRef<MediaStreamTrack[]>([]);

  // Settings
  const [recordMic, setRecordMic] = React.useState(false);
  const [recordSystemAudio, setRecordSystemAudio] = React.useState(true);
  const [cursorStyle, setCursorStyle] = React.useState<"always" | "motion" | "never">("always");

  React.useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopStream = () => {
    allTracksRef.current.forEach(track => {
      try { track.stop(); } catch (e) {}
    });
    allTracksRef.current = [];
    if (stream) {
      setStream(null);
    }
  };

  const startScreenShare = async () => {
    try {
      allTracksRef.current = [];
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: cursorStyle } as any,
        audio: recordSystemAudio ? {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100
        } : false
      });
      allTracksRef.current.push(...displayStream.getTracks());
      
      let finalStream = displayStream;

      if (recordMic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100
            }
          });
          allTracksRef.current.push(...micStream.getTracks());
          
          const audioContext = new window.AudioContext();
          const dest = audioContext.createMediaStreamDestination();
          
          if (displayStream.getAudioTracks().length > 0) {
            const systemSource = audioContext.createMediaStreamSource(displayStream);
            systemSource.connect(dest);
          }
          
          if (micStream.getAudioTracks().length > 0) {
            const micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(dest);
          }
          
          const tracks = [
            ...displayStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
          ];
          finalStream = new MediaStream(tracks);
          
        } catch (micErr) {
          console.warn("Could not access microphone", micErr);
          alert("Microphone access denied or unavailable. Recording without mic.");
        }
      }
      
      setStream(finalStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = finalStream;
        videoRef.current.muted = true; // Always mute local playback to avoid feedback
      }

      // Stop if user clicks "Stop sharing" on the browser UI
      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        stopStream();
      };
      
      // Auto-start recording immediately after sharing begins
      setTimeout(() => {
        startRecording(finalStream);
      }, 100);
      
    } catch (err: any) {
      console.error("Screen sharing failed", err);
      alert(`Could not start screen sharing: ${err.message}`);
    }
  };

  const startRecording = (streamToRecord: MediaStream | null = stream) => {
    if (!streamToRecord) return;
    
    chunksRef.current = [];
    
    // Check supported mime types depending on audio track presence
    const hasAudio = streamToRecord.getAudioTracks().length > 0;
    const mimeTypes = hasAudio 
      ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
      : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
      
    let options: any = {};
    for (const type of mimeTypes) {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type)) {
        options = { mimeType: type };
        break;
      }
    }

    const recorder = new MediaRecorder(streamToRecord, options);
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    
    try {
      recorder.start(1000); // chunk every second
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);
      
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Failed to start MediaRecorder:", err);
      alert("Failed to start recording: " + err.message + "\n\nTry unchecking 'System Audio' if you're on a Mac or recording an entire screen, as some combinations aren't supported by this browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleReset = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setDuration(0);
    // Restart screen share flow
    startScreenShare();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Monitor className="w-8 h-8 text-primary" />
          Screen Recorder
        </h1>
        <p className="text-muted-foreground">
          Record your screen securely in your browser. No extensions or downloads required.
        </p>
      </div>

      {!stream && !recordedUrl && (
        <div className="flex flex-col items-center justify-center p-8 lg:p-12 border-2 border-dashed border-border rounded-xl bg-card gap-8">
          
          <div className="flex flex-col items-center text-center gap-2">
            <div className="p-6 bg-muted rounded-full mb-2">
              <Monitor className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-2xl font-bold">Configure Recording</h3>
            <p className="text-muted-foreground max-w-md">
              Select your recording preferences before sharing your screen.
            </p>
          </div>

          <div className="flex flex-col w-full max-w-md gap-4 bg-background p-6 rounded-xl border border-border/50 smooth-shadow">
             
             {/* System Audio */}
             <label className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border/50">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-primary" />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">System Audio</span>
                    <span className="text-[10px] text-muted-foreground">Capture system sounds (tab/window)</span>
                  </div>
                </div>
                <input type="checkbox" checked={recordSystemAudio} onChange={(e) => setRecordSystemAudio(e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
             </label>

             {/* Microphone */}
             <label className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border/50">
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-primary" />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">Microphone</span>
                    <span className="text-[10px] text-muted-foreground">Add your voice narration</span>
                  </div>
                </div>
                <input type="checkbox" checked={recordMic} onChange={(e) => setRecordMic(e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
             </label>

             {/* Cursor Style */}
             <div className="flex flex-col gap-2 p-3">
                <div className="flex items-center gap-3 mb-2">
                  <MousePointer2 className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm">Mouse Pointer Visibility</span>
                </div>
                <div className="flex gap-2">
                  {[
                    { id: "always", label: "Always Show" },
                    { id: "motion", label: "On Motion" },
                    { id: "never", label: "Hide Cursor" }
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCursorStyle(c.id as any)}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border ${
                        cursorStyle === c.id 
                          ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                          : "bg-card border-border/50 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
             </div>

          </div>

          <button
            onClick={startScreenShare}
            className="w-full max-w-md py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Monitor className="w-5 h-5" />
            Start Screen Share
          </button>
        </div>
      )}

      {stream && !recordedUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-destructive animate-pulse' : 'bg-emerald-500'}`} />
              <span className="font-bold">{isRecording ? `Recording... ${formatTime(duration)}` : 'Ready to record'}</span>
            </div>
            {!isRecording && (
              <button
                onClick={stopStream}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="w-full bg-black rounded-lg overflow-hidden flex items-center justify-center relative min-h-[400px]">
            <video 
              ref={videoRef}
              autoPlay 
              muted 
              className="max-w-full max-h-[600px] object-contain shadow-lg"
            />
            {isRecording && (
              <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full border border-destructive flex items-center gap-2 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-destructive font-mono font-bold text-sm">{formatTime(duration)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-center mt-2">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-8 py-4 bg-destructive text-destructive-foreground font-bold rounded-full hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-destructive/20"
              >
                <Circle className="w-5 h-5 fill-current" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-8 py-4 bg-secondary text-secondary-foreground font-bold rounded-full border-2 border-border hover:bg-muted active:scale-95 transition-all"
              >
                <Square className="w-5 h-5 fill-current" />
                Stop Recording
              </button>
            )}
          </div>
        </div>
      )}

      {recordedUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Recording Complete
              </p>
              <p className="text-sm text-muted-foreground">
                Duration: {formatTime(duration)} • Size: {((recordedBlob?.size || 0) / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>

          <div className="w-full bg-black/5 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px] p-4">
            <video src={recordedUrl} controls className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg" />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={recordedUrl}
              download={`gifter_screen_recording_${Date.now()}.webm`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 active:scale-95 transition-all text-lg shadow-xl shadow-primary/20"
            >
              <Download className="w-6 h-6" />
              Save Recording (WebM)
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-border hover:bg-muted font-bold transition-all text-lg"
            >
              <RefreshCw className="w-5 h-5" />
              Record New
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
