const { execSync } = require('child_process');

// 1. Create a dummy video
execSync('ffmpeg -y -f lavfi -i color=c=red:s=2560x1600:d=1 dummy_vid.mp4 2>/dev/null');

// 2. Create a dummy image representing the text watermark
// The text canvas is a perfect square with transparent background, and the text is in the middle.
// We'll create a 445x445 image, with a blue rectangle in the middle (width 400, height 64)
execSync(`ffmpeg -y -f lavfi -i color=c=black@0.0:s=445x445,format=rgba -vf "drawbox=x=(iw-400)/2:y=(ih-64)/2:w=400:h=64:color=blue:t=fill" -vframes 1 dummy_wm.png 2>/dev/null`);

// 3. Apply the filter
// scale = 100 (100% of video width)
const scale = 100;
const opacityFilter = "[1:v]copy[wm_op];";
const prepFilter = opacityFilter + `[wm_op][0:v]scale2ref=w='trunc(main_w*${scale / 100}/2)*2':h='trunc(ow/a/2)*2'[wm][ref];`;
// pos = bottom left
const posFilter = `max(0,W*0.1-w/2):max(0,H*0.9-h/2)`;
const overlayFilter = prepFilter + `[ref][wm]overlay=${posFilter}`;

try {
  execSync(`ffmpeg -y -i dummy_vid.mp4 -i dummy_wm.png -filter_complex "${overlayFilter}" output.mp4 2>/dev/null`);
  console.log("Success");
} catch(e) {
  console.log("Error", e.message);
}

