#!/bin/zsh
# mix.sh → out/mix-full.wav (voice + music + sfx) and out/mix-nomusic.wav, both −14 LUFS, ≤ −1 dBTP
set -e
cd ${0:A:h}
VO=../audio/vo-cta.wav; DUR=50.2
lufs() { ffmpeg -hide_banner -nostats -i $1 -af ebur128 -f null - 2>&1 | awk '/Summary/{s=1} s&&/I:/{print $2; exit}'; }
ffmpeg -v error -y -i $VO -af "pan=stereo|c0=c0|c1=c0,apad=whole_dur=$DUR" -ar 48000 -c:a pcm_f32le out/vo.wav
IV=$(lufs out/vo.wav); IM=$(lufs out/music.wav); IS=$(lufs out/sfx.wav)
GM=$(echo "($IV - ${MUSIC_UNDER:-10}) - ($IM)" | bc -l); GS=$(echo "($IV - ${SFX_UNDER:-15}) - ($IS)" | bc -l)
echo "voice $IV · music $IM → ${GM} dB · sfx $IS → ${GS} dB"
# music: −4 dB low shelf (phone speakers), ducked ~3 dB under the voice
ffmpeg -v error -y -i out/music.wav -i out/vo.wav -filter_complex "[0]volume=${GM}dB,bass=g=-4:f=120:w=0.6[m];[m][1]sidechaincompress=threshold=0.03:ratio=6:attack=12:release=400:makeup=1[d]" -map "[d]" -c:a pcm_f32le out/music-mixed.wav
ffmpeg -v error -y -i out/sfx.wav -af "volume=${GS}dB,equalizer=f=4000:t=q:w=1.4:g=-4,lowpass=f=9000" -c:a pcm_f32le out/sfx-mixed.wav # out of the voice's sibilance band
ffmpeg -v error -y -i out/vo.wav -i out/music-mixed.wav -i out/sfx-mixed.wav -filter_complex "[0][1][2]amix=inputs=3:normalize=0" -c:a pcm_f32le out/full-pre.wav
ffmpeg -v error -y -i out/vo.wav -i out/sfx-mixed.wav -filter_complex "[0][1]amix=inputs=2:normalize=0" -c:a pcm_f32le out/nomusic-pre.wav
ffmpeg -v error -y -i out/music-mixed.wav -i out/sfx-mixed.wav -filter_complex "[0][1]amix=inputs=2:normalize=0" -c:a pcm_f32le out/bed.wav
echo "bed (music+sfx) $(lufs out/bed.wav) LUFS vs voice $IV"
for v in full nomusic; do
  I=$(lufs out/$v-pre.wav); G=$(echo "-14 - ($I)" | bc -l)
  ffmpeg -v error -y -i out/$v-pre.wav -af "volume=${G}dB,alimiter=limit=0.84:attack=1:release=50:level=disabled,atrim=0:$DUR" -ar 48000 -c:a pcm_f32le out/mix-$v.wav
  ffmpeg -hide_banner -nostats -i out/mix-$v.wav -af ebur128=peak=true -f null - 2>&1 | awk -v n=$v '/Summary/{s=1} s&&/I:/{i=$2} s&&/Peak:/{p=$2} END{print n": I " i " LUFS, true peak " p " dBFS"}'
done
