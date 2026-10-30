#!/bin/zsh
# render.sh vN → out/vN/agent-day-full.mp4 (+ -nomusic, preview-720) — picture from reel.html, sound from make-audio.mjs, one clock (timing.js)
set -e
cd ${0:A:h}; V=${1:?version}; O=out/$V; mkdir -p $O
node make-audio.mjs && ./mix.sh && node capture.mjs video 5 | tail -2
for v in full nomusic; do ffmpeg -v error -y -i reel-video.mp4 -i out/mix-$v.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart $O/agent-day-$v.mp4; done
ffmpeg -v error -y -i $O/agent-day-full.mp4 -vf scale=-2:1280 -c:v libx264 -crf 26 -preset fast -c:a aac -b:a 128k $O/preview-720.mp4
echo "$V ready → $O"
