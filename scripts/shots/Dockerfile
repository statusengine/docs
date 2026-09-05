# Headless Chromium for visual review of the built site.
#
# Deliberately separate from the Hugo image: the build toolchain stays small
# and reproducible, and this only ever runs by hand via `make shots`. Nothing
# in the published site depends on it.
FROM node:20-bookworm-slim

# Browsers land outside /root so a non-root run can still read them, and
# NODE_PATH lets shoot.js require the globally installed package.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    NODE_PATH=/usr/local/lib/node_modules

RUN npm install -g playwright@1.63.0 \
 && playwright install --with-deps chromium \
 && chmod -R a+rX /ms-playwright \
 && npm cache clean --force

WORKDIR /shots
COPY shoot.js .
