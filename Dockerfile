FROM nginx:1.27-alpine
COPY index.html app.js lab.js /usr/share/nginx/html/
ARG SOURCE_SHA=unknown
RUN printf '%s\n' "$SOURCE_SHA" > /usr/share/nginx/html/version.txt
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
