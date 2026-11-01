#!/bin/bash
# kill node processes running next (by scanning /proc, excluding this script)
for d in /proc/[0-9]*; do
  pid=${d#/proc/}
  [ "$pid" = "$$" ] && continue
  cmd=$(tr '\0' ' ' < $d/cmdline 2>/dev/null)
  case "$cmd" in
    *next-server*|*"next start"*|*"next/dist/bin/next"*) kill $pid 2>/dev/null && echo "killed $pid";;
  esac
done
