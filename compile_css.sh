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

# Compile SCSS from css/ into the served directory web/css/
npx sass css/site.scss web/css/site.css --style=compressed
