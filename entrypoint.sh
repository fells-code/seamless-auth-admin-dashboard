#!/bin/sh

cat <<EOF > /usr/share/nginx/html/config.js
window.__SEAMLESS_CONFIG__ = {
  API_URL: "${API_URL}"
};
EOF

exec nginx -g "daemon off;"