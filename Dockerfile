FROM node:22-alpine AS engine
WORKDIR /opt/vila
COPY app.js lab.js ./
COPY server ./server
RUN mkdir -p /data && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["node","server/index.cjs"]

FROM nginx:1.27-alpine
COPY index.html app.js lab.js remote.js /usr/share/nginx/html/
ARG SOURCE_SHA=unknown
RUN printf '%s\n' "$SOURCE_SHA" > /usr/share/nginx/html/version.txt \
    && sed -i "s|src=\"./lab.js\"|src=\"./lab.js?v=${SOURCE_SHA}\"|g; s|src=\"./app.js\"|src=\"./app.js?v=${SOURCE_SHA}\"|g; s|src=\"./remote.js\"|src=\"./remote.js?v=${SOURCE_SHA}\"|g" /usr/share/nginx/html/index.html
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
