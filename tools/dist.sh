#!/bin/bash
node_modules/.bin/uglifyjs\
    --comments\
    --mangle sort=true\
    --compress\
    --output core/matchon-core.min.1.0.0.js core/matchon-core.js
