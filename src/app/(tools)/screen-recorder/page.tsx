"use client";

import * as React from "react";
import { Download, RefreshCw, Monitor, Play, Square, Circle } from "lucide-react";

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

  React.useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startScreenShare = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100
        }
      });
      
      setStream(displayStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = displayStream;
      }

      // Stop if user clicks "Stop sharing" on the browser UI
      displayStream.getVideoTracks()[0].onended = () => {
        if (isRecording) stopRecording();
        stopStream();
      };
      
    } catch (err: any) {
      console.error("Screen sharing failed", err);
      alert(`Could not start screen sharing: ${err.message}`);
    }
  };

  const startRecording = () => {
    if (!stream) return;
    
    chunksRef.current = [];
    
    // Check supported mime types
    const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    let options = {};
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        options = { mimeType: type };
        break;
      }
    }

    const recorder = new MediaRecorder(stream, options);
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
    };
    
    recorder.start(1000); // chunk every second
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setDuration(0);
    
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
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
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-card gap-6">
          <div className="p-6 bg-muted rounded-full">
            <Monitor className="w-12 h-12 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">Share your screen</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Click the button below to grant permission. Your recording happens entirely locally and never leaves your computer.
            </p>
          </div>
          <button
            onClick={startScreenShare}
            className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all text-lg"
          >
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
