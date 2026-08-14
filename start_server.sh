#!/bin/bash

# Detect whether the script runs inside a terminal or not
if [[ -t 1 ]]; then
    # We are in a terminal, run normally
    echo "Running in terminal..."
else
    # Not in a terminal: open Konsole and run the script inside it
    konsole -e bash -c "$0; exit"
    exit 0
fi

# Stop on any error
set -e

# Go to the directory holding this script
cd "$(dirname "$0")"

# Build first, so web/ holds a fresh bundle and stylesheet
npm run build

# Serve the static site with caching disabled. PORT overrides the default.
npx http-server web -p "${PORT:-8080}" -c-1
