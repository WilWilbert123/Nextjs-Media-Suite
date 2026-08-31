import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { getWasmConcurrency } from "../utils/memory";

let ffmpegInstance: FFmpeg | null = null;

/**
 * Initializes the FFmpeg WebAssembly engine.
 * Ensures only a single instance is created and loaded.
 */
export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();

  // Load from local public/wasm directory to ensure privacy and offline capability
  const baseURL = "/wasm";
  
  // Keep track of logs to surface exact errors if it fails
  (ffmpeg as any)._logs = [];
  ffmpeg.on("log", ({ message }) => {
    console.log("[FFmpeg]:", message);
    (ffmpeg as any)._logs.push(message);
    if ((ffmpeg as any)._logs.length > 50) {
      (ffmpeg as any)._logs.shift(); // Keep only last 50 logs
    }
  });

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    workerURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.worker.js`,
      "text/javascript"
    ),
  });

  ffmpegInstance = ffmpeg;
  return ffmpegInstance;
}

/**
 * Forcefully terminates the FFmpeg instance and WebWorker.
 * The next call to getFFmpeg() will spawn a new worker.
 */
export function abortFFmpeg() {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch (e) {
      console.error("Error terminating FFmpeg:", e);
    }
    ffmpegInstance = null;
  }
}

export async function processVideo(
  file: File,
  args: string[],
  outputName: string,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const ffmpeg = await getFFmpeg();
  
  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress);
    });
  }

  // Ensure the input file has a valid extension for FFmpeg to probe correctly
  const lastDot = file.name.lastIndexOf(".");
  const ext = lastDot !== -1 ? file.name.substring(lastDot) : ".mp4";
  const inputName = `input_vid${ext}`;
  
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Limit threads based on device capabilities
  const threads = getWasmConcurrency();

  const code = await ffmpeg.exec(["-threads", threads.toString(), "-i", inputName, ...args, outputName]);
  if (code !== 0) {
    const logs = (ffmpeg as any)._logs || [];
    const errorMsg = logs.slice(-5).join(" | ");
    
    // User friendly edge cases
    if (errorMsg.includes("does not contain any stream")) {
      throw new Error("This video file does not contain an audio track to extract.");
    }
    
    throw new Error(`FFmpeg error (code ${code}): ${errorMsg || 'Unknown error'}`);
  }

  const outputData = await ffmpeg.readFile(outputName);

  // Clean up memory
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  if (onProgress) {
    ffmpeg.off("progress", () => { });
  }

  return outputData as Uint8Array;
}

export async function processImagesToGif(
  files: File[],
  fps: number,
  options: { format: 'gif' | 'webp'; scale: string; loop: boolean },
  outputName: string,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const ffmpeg = await getFFmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress);
    });
  }

  const inputNames = [];
  const firstExt = files[0].name.substring(files[0].name.lastIndexOf("."));
  
  let inputPattern = "";

  if (files.length === 1) {
    // If only 1 file, treat it as a direct input (allows editing existing animated GIFs/WebPs)
    inputPattern = `input${firstExt}`;
    await ffmpeg.writeFile(inputPattern, await fetchFile(files[0]));
    inputNames.push(inputPattern);
  } else {
    // Multiple files, treat as an image sequence
    for (let i = 0; i < files.length; i++) {
      const paddedIndex = String(i + 1).padStart(3, '0');
      const inputName = `img_${paddedIndex}${firstExt}`;
      await ffmpeg.writeFile(inputName, await fetchFile(files[i]));
      inputNames.push(inputName);
    }
    inputPattern = `img_%03d${firstExt}`;
  }

  const threads = getWasmConcurrency();
  
  const args = [
    "-threads", threads.toString()
  ];
  
  if (files.length > 1) {
    // Only set framerate for image sequences
    args.push("-framerate", fps.toString());
  }

  args.push("-i", inputPattern);

  // Scale filter
  let filterStr = "";
  if (options.scale !== "original") {
    filterStr += `scale=-1:${options.scale},`; // Scale height, keep aspect ratio width
  }

  if (options.format === 'gif') {
    filterStr += "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse";
    args.push("-filter_complex", filterStr);
    args.push("-loop", options.loop ? "0" : "-1");
  } else {
    // WebP
    if (filterStr) {
      // Remove trailing comma
      if (filterStr.endsWith(",")) filterStr = filterStr.slice(0, -1);
      args.push("-vf", filterStr);
    }
    args.push("-vcodec", "libwebp");
    args.push("-lossless", "0");
    args.push("-q:v", "80"); // Good default quality
    args.push("-loop", options.loop ? "0" : "1");
  }

  args.push(outputName);

  const code = await ffmpeg.exec(args);
  
  if (code !== 0) {
    const logs = (ffmpeg as any)._logs || [];
    const errorMsg = logs.slice(-5).join(" | ");
    throw new Error(`FFmpeg error (code ${code}): ${errorMsg || 'Unknown error'}`);
  }

  const outputData = await ffmpeg.readFile(outputName);

  // Clean up memory
  for (const name of inputNames) {
    await ffmpeg.deleteFile(name);
  }
  await ffmpeg.deleteFile(outputName);

  if (onProgress) {
    ffmpeg.off("progress", () => { });
  }

  return outputData as Uint8Array;
}

export async function processWithWatermark(
  targetFile: File,
  watermarkFile: File,
  args: string[],
  outputName: string,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const ffmpeg = await getFFmpeg();
  
  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress);
    });
  }

  const targetExt = targetFile.name.substring(targetFile.name.lastIndexOf("."));
  const inputTarget = `input_target${targetExt}`;
  
  const wmExt = watermarkFile.name.substring(watermarkFile.name.lastIndexOf("."));
  const inputWm = `input_wm${wmExt}`;
  
  await ffmpeg.writeFile(inputTarget, await fetchFile(targetFile));
  await ffmpeg.writeFile(inputWm, await fetchFile(watermarkFile));

  const threads = getWasmConcurrency();

  const code = await ffmpeg.exec([
    "-threads", threads.toString(),
    "-i", inputTarget,
    "-i", inputWm,
    ...args,
    outputName
  ]);

  if (code !== 0) {
    const logs = (ffmpeg as any)._logs || [];
    const errorMsg = logs.slice(-5).join(" | ");
    throw new Error(`FFmpeg error (code ${code}): ${errorMsg || 'Unknown error'}`);
  }

  const outputData = await ffmpeg.readFile(outputName);

  await ffmpeg.deleteFile(inputTarget);
  await ffmpeg.deleteFile(inputWm);
  await ffmpeg.deleteFile(outputName);

  if (onProgress) {
    ffmpeg.off("progress", () => { });
  }

  return outputData as Uint8Array;
}
