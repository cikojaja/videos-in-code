#!/bin/zsh
# sheet.sh out.png t1 t2 … → renders stills (safe overlay) and tiles them 6 per row, 360 px wide each, in the given order
OUT=$1; shift
node capture.mjs stills $@ --safe >/dev/null || exit 1
args=(); f=""; i=0
for t in $@; do args+=(-i stills/t-$(printf %.2f $t).png); f+="[$i]scale=360:-1[v$i];"; i=$((i+1)); done
n=$i; cols=6; rows=$(( (n + cols - 1) / cols )); k=0
for r in $(seq 0 $((rows-1))); do row=""; c=0
  for j in $(seq 0 $((cols-1))); do idx=$((r*cols+j)); if [ $idx -lt $n ]; then row+="[v$idx]"; else f+="color=white:s=360x640:d=1[e$idx];"; row+="[e$idx]"; fi; done
  f+="${row}hstack=${cols}[r${r}];"; done
for r in $(seq 0 $((rows-1))); do f+="[r$r]"; done
[ $rows -gt 1 ] && f+="vstack=$rows" || f+="null"
ffmpeg -v error -y $args -filter_complex "$f" -frames:v 1 $OUT && echo "sheet → $OUT"
