#!/bin/bash

function printUsage() {
  echo "Syntax is: $0 <file> <# pixels>"
  exit 1
}

filename=$1
if [ -z "$filename" ]; then
  printUsage
fi

numPixels=$2
if [ -z "$numPixels" ]; then
  printUsage
fi

tmpfile=$(mktemp -t imgXXXXX.gif)
dim=$(identify $filename | awk '{print $3}' | cut -d'x' -f1)
newdim=$(($dim - $(($numPixels * 2))))

convert $filename -background transparent \
  -repage 0x0+0+0 \
  -gravity center \
  -scale ${newdim}x${newdim} \
  -extent ${dim}x${dim} \
  $tmpfile

mv $tmpfile $filename
