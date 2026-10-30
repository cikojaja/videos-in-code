#!/bin/zsh
# mix.sh → out/mix-full.wav (music + sfx, −14 LUFS, ≤ −1 dBTP) and out/mix-nomusic.wav (sfx only, for a CapCut music bed)
set -e
cd ${0:A:h}
DUR=31.2
lufs() { ffmpeg -hide_banner -nostats -i $1 -af ebur128 -f null - 2>&1 | awk '/Summary/{s=1} s&&/I:/{print $2; exit}'; }
IM=$(lufs out/music.wav); IS=$(lufs out/sfx.wav); GS=$(echo "($IM - ${SFX_UNDER:-6}) - ($IS)" | bc -l)
echo "music $IM · sfx $IS → ${GS} dB"
ffmpeg -v error -y -i out/music.wav -af "bass=g=-4:f=120:w=0.6" -c:a pcm_f32le out/music-mixed.wav # phones play the low end loud
ffmpeg -v error -y -i out/sfx.wav -af "volume=${GS}dB" -c:a pcm_f32le out/sfx-mixed.wav
ffmpeg -v error -y -i out/music-mixed.wav -i out/sfx-mixed.wav -filter_complex "[0][1]amix=inputs=2:normalize=0" -c:a pcm_f32le out/full-pre.wav
cp out/sfx-mixed.wav out/nomusic-pre.wav
for v in full nomusic; do
  T=$([ $v = full ] && echo -14 || echo -18); I=$(lufs out/$v-pre.wav); G=$(echo "$T - ($I)" | bc -l)
  ffmpeg -v error -y -i out/$v-pre.wav -af "volume=${G}dB,alimiter=limit=0.8:attack=1:release=50:level=disabled,atrim=0:$DUR" -ar 48000 -c:a pcm_f32le out/mix-$v.wav
  ffmpeg -hide_banner -nostats -i out/mix-$v.wav -af ebur128=peak=true -f null - 2>&1 | awk -v n=$v '/Summary/{s=1} s&&/I:/{i=$2} s&&/Peak:/{p=$2} END{print n": I " i " LUFS, true peak " p " dBFS"}'
done
