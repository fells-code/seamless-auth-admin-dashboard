# Base images are pinned by multi-arch digest for reproducible builds. To
# refresh, run: docker buildx imagetools inspect <image:tag> and copy the
# top-level Digest.
FROM node:24-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build


# Unprivileged nginx: runs as user nginx (uid 101) and listens on 8080 so the
# container never needs root or a privileged port.
FROM nginxinc/nginx-unprivileged:alpine@sha256:59ccf0943b0b8e8d9e6ea9039a39555730f544701a655c596f7df7d096c593f5

USER root

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY ./security-headers.conf /etc/nginx/security-headers.conf
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
