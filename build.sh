#!/bin/sh

rm -r ./dist
yarn parcel build src/index.html --public-url ./
cp -r config/* ./dist