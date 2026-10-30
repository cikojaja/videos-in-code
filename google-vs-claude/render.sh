#!/bin/zsh
# render.sh v2 → ../out/v2/google-vs-claude-full.mp4, -nomusic.mp4, preview-720.mp4
set -e
cd ${0:A:h}; V=${1:?version}; O=../out/$V; mkdir -p $O
node make-audio.mjs && ./mix.sh && node capture.mjs video 5 | tail -2
for v in full nomusic; do ffmpeg -v error -y -i reel-video.mp4 -i out/mix-$v.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart $O/google-vs-claude-$v.mp4; done
ffmpeg -v error -y -i $O/google-vs-claude-full.mp4 -vf scale=-2:1280 -c:v libx264 -crf 26 -preset fast -c:a aac -b:a 128k $O/preview-720.mp4
echo "$V ready → $O"
