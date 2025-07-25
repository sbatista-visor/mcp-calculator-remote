# syntax=docker.io/docker/dockerfile:1.7-labs
#
# Setup
#
# Use FROM node:lts-alpine for minimum file size
# Use FROM node:lts-slim for maximum compatibility
# More info:
# https://snyk.io/blog/choosing-the-best-node-js-docker-image/
# https://www.specfy.io/blog/1-efficient-dockerfile-nodejs-in-7-steps
#
# To print commands and debug building dockerfile use:
#
# RUN pwd && ls -a
#
# To see full docker logs run the following command:
#
# docker build . --progress=plain
ARG NODE_VERSION
FROM node:${NODE_VERSION}-alpine AS base

# Add NEXT_PUBLIC env vars to successfully build the client in Github actions
ARG NODE_ENV="production"
ENV NODE_ENV=$NODE_ENV
# Ensure Node has plenty of RAM allocated for building
ENV NODE_OPTIONS="--max_old_space_size=3072"

# Install utilities
RUN apk update
# Without bash we can't access a terminal and a result cannot enter the container and access the REPL
RUN apk add --no-cache bash
# https://engineeringblog.yelp.com/2016/01/dumb-init-an-init-for-docker.html
RUN apk add --no-cache dumb-init
# https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
RUN apk add --no-cache libc6-compat
# ncdu allows us to more easily see what is taking up space within the container
# RUN apk add --no-cache ncdu

# Install & activate pnpm
RUN npm install --global corepack@latest
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm config set store-dir /tmp/cache/pnpm

#
# Prepare to install dependencies
#
FROM base AS source
WORKDIR /tmp

# Copy and install dependencies separately from the app's code
# To leverage Docker's cache when no dependency has changed
COPY --exclude=**/node_modules . .

#
# Install dependencies
#
FROM base AS deps
WORKDIR /tmp
COPY --from=source /tmp ./

# Install development dependencies
RUN --mount=type=cache,id=pnpm-store,target=/tmp/cache/pnpm\
  pnpm install --prod=false --frozen-lockfile

#
# Build
#
FROM base AS build
WORKDIR /build

# Install dependencies, including development dependencies
COPY --from=deps /tmp ./

# Build the application
RUN node --run build

# Purge node_modules
RUN rm -rf node_modules && pnpm recursive exec -- rm -rf ./node_modules

# Install production dependencies
RUN --mount=type=cache,id=pnpm-store,target=/tmp/cache/pnpm\
 pnpm install --frozen-lockfile --prod --ignore-scripts

#
# Package
#
# Build the final image with only production dependencies
FROM base AS package
WORKDIR /app

# https://www.specfy.io/blog/1-efficient-dockerfile-nodejs-in-7-steps#h-final-docker-image
USER node

# Copy files
COPY --from=build --chown=node:node /build/app.json ./app.json
COPY --from=build --chown=node:node /build/package.json ./package.json
COPY --from=build --chown=node:node /build/infrastructure ./infrastructure
COPY --from=build --chown=node:node /build/.next ./.next

# Copy node_modules (no exceptions)
COPY --from=build --chown=node:node /build/node_modules ./node_modules


# Start
#
CMD ["dumb-init","node", "--run", "start"]
