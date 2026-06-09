#!/bin/bash
# Azure App Service startup script for Next.js on Linux
node_modules/.bin/next start -p ${PORT:-8080}
