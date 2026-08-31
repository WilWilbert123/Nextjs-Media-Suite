const { execSync } = require('child_process');

execSync('ffmpeg -y -f lavfi -i color=c=red:s=2560x1600:d=1 dummy_vid.mp4 2>/dev/null');
execSync(`ffmpeg -y -f lavfi -i color=c=blue:s=2560x2560:d=1 -vframes 1 dummy_wm.png 2>/dev/null`);

const filter = "[1:v]copy[wm_op];[wm_op]scale=2560:-2[wm];[0:v][wm]overlay=-1024:160";

try {
  execSync(`ffmpeg -y -i dummy_vid.mp4 -i dummy_wm.png -filter_complex "${filter}" output.mp4 2>/dev/null`);
  console.log("Success with negative coordinates!");
} catch(e) {
  console.log("Error", e.message);
}

