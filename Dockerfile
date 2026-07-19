# Base images are pinned by multi-arch digest for reproducible builds. To
# refresh, run: docker buildx imagetools inspect <image:tag> and copy the
# top-level Digest.
FROM node:26-slim@sha256:715e55e4b84e4bb0ff48e49b398a848f08e55daed8eb6a0ea1839ae53bc57583 AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build


# Unprivileged nginx: runs as user nginx (uid 101) and listens on 8080 so the
# container never needs root or a privileged port.
FROM nginxinc/nginx-unprivileged:alpine@sha256:a718212f9cf21e241f14067333000a3f0930292f5354fe0db269e9a2a2596b9e

USER root

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

COPY entrypoint.sh /entrypoint.sh

# The entrypoint writes config.js into the web root at start, so the non-root
# nginx user must own that directory.
RUN chmod +x /entrypoint.sh \
  && chown -R nginx:nginx /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/health || exit 1

CMD ["/entrypoint.sh"]
