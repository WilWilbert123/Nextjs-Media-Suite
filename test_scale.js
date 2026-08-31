const { execSync } = require('child_process');

// Create dummy 2560x1600 video
execSync('ffmpeg -y -f lavfi -i color=c=red:s=2560x1600:d=1 dummy_vid.mp4 2>/dev/null');
// Create dummy 445x445 image
execSync('ffmpeg -y -f lavfi -i color=c=blue:s=445x445:d=1 -vframes 1 dummy_wm.png 2>/dev/null');

// Filter
const filter = "[1:v]copy[wm_op];[wm_op][0:v]scale2ref=w='trunc(main_w*0.5/2)*2':h='trunc(ow/a/2)*2'[wm][ref];[ref][wm]overlay=W/2:H/2";

execSync(`ffmpeg -y -i dummy_vid.mp4 -i dummy_wm.png -filter_complex "${filter}" output.mp4 2>/dev/null`);

// Probe output
const out = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 output.mp4`).toString();
console.log("Output dimensions: " + out);

