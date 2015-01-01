#!/bin/bash

file=$1
if [ ! -f "$file" ]; then
  echo "File $file does not exist"
  exit 1
fi
output=$2
if [ -z "$output" ]; then
  echo "specify output file"
  exit 1
fi

width=$(identify $file | awk '{print $3}' | cut -d'x' -f1)
height=$(identify $file | awk '{print $3}' | cut -d'x' -f2)
frames=$(echo $height/$width | bc)

tmpdir=$(mktemp -d)
echo $tmpdir

for i in $(seq 0 $(($frames - 1))); do
  offset=$(($i * $width))
  convert $file -filter Point -crop ${width}x${width}+0+${offset} -resize 100x100 +antialias $tmpdir/$i.gif
done

(
  cd $tmpdir
  convert -delay 100 -loop 0 -repage 100x100+0+0 $(ls -1 *.gif | sort -n)  -size 100x100 animation.gif
)
mv $tmpdir/animation.gif $output
rm -rf $tmpdir
