#!/bin/bash
# Azure App Service startup script for Next.js on Linux.
# Oryx ships node_modules as a tar.gz and the .bin/next symlink is lost on
# extraction, so invoke the real Next.js entrypoint directly via node.
cd /home/site/wwwroot
node node_modules/next/dist/bin/next start -p ${PORT:-8080}
