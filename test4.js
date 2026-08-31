const { execSync } = require('child_process');

execSync('ffmpeg -y -f lavfi -i color=c=red:s=2560x1600:d=1 dummy_vid.mp4 2>/dev/null');
execSync(`ffmpeg -y -f lavfi -i color=c=black@0.0:s=445x445,format=rgba -vf "drawbox=x=(iw-400)/2:y=(ih-64)/2:w=400:h=64:color=blue:t=fill" -vframes 1 dummy_wm.png 2>/dev/null`);

const scale = 50;
const dragPos = {x: 10, y: 90};

const opacityFilter = "[1:v]copy[wm_op];";
const prepFilter = opacityFilter + `[wm_op][0:v]scale2ref=w='trunc(main_w*${scale / 100}/2)*2':h='trunc(ow/a/2)*2'[wm][ref];`;
// Removed max(0, ...) to see where it lands naturally!
// Wait, the actual code has max(0, ...). I will use the actual code!
const posFilter = `max(0\\,W*${dragPos.x / 100}-w/2):max(0\\,H*${dragPos.y / 100}-h/2)`;
const overlayFilter = `${prepFilter}[ref][wm]overlay=${posFilter}`;

try {
  execSync(`ffmpeg -y -i dummy_vid.mp4 -i dummy_wm.png -filter_complex "${overlayFilter}" output.mp4 2>/dev/null`);
  console.log("Success! Checking overlay position...");
  // I can't easily check overlay position without visual. But I can check dimensions.
} catch(e) {
  console.log("Error", e.message);
}

