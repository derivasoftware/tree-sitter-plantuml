#!/usr/bin/env bash
# Build the python wheel and make it installable without a compiler.
#
# The extension is built against the stable ABI (cp310-abi3), so one wheel
# per platform serves python 3.10+. setuptools tags that wheel with the
# build platform — `linux_x86_64` — which no index may serve and which
# promises nothing to other distributions. The binary itself is portable:
# no external shared libraries, GLIBC 2.4 at most. So there is nothing to
# repair, only a tag to correct: `auditwheel show` proves the wheel is
# manylinux-clean and `wheel tags` rewrites the tag. Neither needs
# patchelf, so the release runner stays a plain shell runner.
#
# The smoke step is the point of the script: the artefact that gets
# published is the one installed and parsed here, in a venv that never saw
# this source tree.
#
# Usage: scripts/build_wheels.sh [outdir]   (default: dist)
set -euo pipefail

out=${1:-dist}
mkdir -p "$out"
OUT=$(cd "$out" && pwd)
PLAT=${WHEEL_PLAT:-manylinux_2_17_x86_64.manylinux2014_x86_64}
root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

echo "== build (cp310-abi3)"
python3 -m venv "$work/env"
"$work/env/bin/pip" install -q build auditwheel wheel
"$work/env/bin/python" -m build --wheel --outdir "$work/raw" "$root" >"$work/build.log" 2>&1 ||
  { cat "$work/build.log"; exit 1; }
raw=$(ls "$work"/raw/*.whl)
echo "   $(basename "$raw")"

echo "== audit (no external libraries, glibc floor)"
"$work/env/bin/auditwheel" show "$raw" | sed -n '2,$p' | sed 's/^/   /'

echo "== retag ($PLAT)"
cp "$raw" "$OUT/"
wheel=$("$work/env/bin/python" -m wheel tags --platform-tag "$PLAT" --remove \
  "$OUT/$(basename "$raw")")
wheel="$OUT/$wheel"
echo "   $(basename "$wheel")"

echo "== smoke (clean venv, no source tree)"
python3 -m venv "$work/smoke"
"$work/smoke/bin/pip" install -q "$wheel" tree-sitter
(cd "$work" && "$work/smoke/bin/python" "$root/scripts/smoke_wheel.py")

echo "== published artefact: $(basename "$wheel")"
