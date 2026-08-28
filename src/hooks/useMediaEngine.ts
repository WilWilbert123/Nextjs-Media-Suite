"use client";

import { useState, useCallback, useEffect } from "react";
import { getFFmpeg, processVideo, processImagesToGif } from "../lib/engines/ffmpeg";

export function useMediaEngine() {
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Initialize engine on mount (or lazily when needed)
  useEffect(() => {
    let mounted = true;
    getFFmpeg()
      .then(() => {
        if (mounted) setIsReady(true);
      })
      .catch((err) => {
        if (mounted) setError(`Failed to load media engine: ${err.message}`);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const convertVideo = useCallback(
    async (file: File, args: string[], outputExt: string = ".mp4") => {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      
      try {
        const outputName = `output${outputExt}`;
        const data = await processVideo(file, args, outputName, setProgress);
        
        // Ensure data is compatible with Blob by taking its buffer or casting
        const blob = new Blob([new Uint8Array(data)], { type: `video/${outputExt.slice(1)}` });
        return URL.createObjectURL(blob);
      } catch (err: any) {
        setError(err.message || "An error occurred during processing");
        return null;
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    },
    []
  );

  const convertImagesToGif = useCallback(
    async (files: File[], fps: number = 10) => {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      
      try {
        const outputName = `output.gif`;
        const data = await processImagesToGif(files, fps, outputName, setProgress);
        
        const blob = new Blob([new Uint8Array(data)], { type: `image/gif` });
        return URL.createObjectURL(blob);
      } catch (err: any) {
        setError(err.message || "An error occurred during processing");
        return null;
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    },
    []
  );

  return {
    isReady,
    isProcessing,
    progress,
    error,
    convertVideo,
    convertImagesToGif,
  };
}
