const { execSync } = require('child_process');

execSync('ffmpeg -y -f lavfi -i color=c=red:s=2560x1600:d=1 dummy_vid.mp4 2>/dev/null');
execSync(`ffmpeg -y -f lavfi -i color=c=blue:s=445x445:d=1 -vframes 1 dummy_wm.png 2>/dev/null`);

const filter = "[1:v]copy[wm_op];[wm_op][0:v]scale2ref=w='trunc(main_w*0.5/2)*2':h='trunc(ow/a/2)*2'[wm][ref];[wm]showinfo";

try {
  const output = execSync(`ffmpeg -y -i dummy_vid.mp4 -i dummy_wm.png -filter_complex "${filter}" -f null - 2>&1`);
  const lines = output.toString().split('\n');
  const showinfo = lines.find(l => l.includes('Parsed_showinfo'));
  console.log(showinfo);
} catch(e) {
  console.log("Error", e.message);
}

