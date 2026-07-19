#!/bin/sh
set -eu

API_URL="${API_URL:-http://localhost:3000}"

# API_URL is interpolated into a JS string literal in config.js. Validate it
# before writing so a value containing quotes, backslashes, or whitespace cannot
# break out of the string or inject content. These characters are never valid in
# a URL, so rejecting them also catches misconfiguration early.
case "$API_URL" in
  http://* | https://*) ;;
  *)
    echo "entrypoint: API_URL must start with http:// or https:// (got: $API_URL)" >&2
    exit 1
    ;;
esac

# Delete every character that is valid in a URL; if any bytes remain (quotes,
# backslashes, whitespace, newlines, control characters) the value is unsafe to
# embed in the JS string literal. Count the remaining bytes so a lone newline is
# not lost to command-substitution trailing-newline stripping.
remaining=$(printf '%s' "$API_URL" | tr -d 'A-Za-z0-9:/?#@!$&()*+,;=._~%[]-' | wc -c | tr -d ' ')
if [ "$remaining" -ne 0 ]; then
  echo "entrypoint: API_URL contains characters that are not allowed in a URL" >&2
  exit 1
fi

cat <<EOF > /usr/share/nginx/html/config.js
window.__SEAMLESS_CONFIG__ = {
  API_URL: "${API_URL}"
};
EOF

exec nginx -g "daemon off;"
