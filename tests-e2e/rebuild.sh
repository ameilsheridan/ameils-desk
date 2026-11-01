#!/bin/bash
cd /home/claude/ameils-desk
/home/claude/qa/killnext.sh; sleep 1
if [ "$1" != "nobuild" ]; then npm run build > /tmp/build.log 2>&1 || { tail -30 /tmp/build.log; exit 1; }; fi
(setsid npm run start > /tmp/next.log 2>&1 &)
sleep 4
curl -s -o /dev/null -w "server %{http_code}\n" localhost:3000/
