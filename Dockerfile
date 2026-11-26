FROM node:22.18-alpine
WORKDIR /opt/oturo
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8086
ARG SOURCE_SHA=unknown
ENV SOURCE_SHA=${SOURCE_SHA}
COPY --chown=node:node package.json ./
RUN npm install --omit=dev --no-package-lock --ignore-scripts
COPY --chown=node:node apps ./apps
COPY --chown=node:node packages ./packages
COPY --chown=node:node public ./public
RUN npm exec --yes --package=esbuild@0.25.12 -- esbuild apps/browser-runtime/src/worker.ts --bundle --platform=browser --format=esm --outfile=apps/browser-runtime/worker.js
# On first named-volume mount Docker propagates this directory's node ownership.
RUN mkdir -p /opt/oturo/data && chown node:node /opt/oturo/data
USER node
EXPOSE 8086
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=4 CMD node -e "fetch('http://127.0.0.1:8086/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","--experimental-strip-types","apps/server/src/index.mts"]
