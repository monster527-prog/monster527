#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
 echo 'Node.js 22.13 이상이 필요합니다. https://nodejs.org 에서 LTS를 설치하세요.'
 read -r pause_input
 exit 1
fi
node scripts/check-node.cjs || exit 1
export PORT=33000
export AX_OPEN_BROWSER=1
printf '%s\n' '브라우저에서 http://localhost:33000 을 여세요. 종료: Ctrl+C'
node server.mjs
