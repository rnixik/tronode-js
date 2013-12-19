#!/bin/bash
#
# deploy project
#
#

TARG="/var/www/tronode.js"
HGSOURCE="ssh://hg@bitbucket.org/rnix/tronode.js"

cd "$TARG" || exit 1

echo hg pull -u "$HGSOURCE"
hg pull -u "$HGSOURCE"

forever restart app.js

echo OK!

