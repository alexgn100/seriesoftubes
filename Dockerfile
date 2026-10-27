# Builds the game the same way the release does (scripts/build.js) and serves
# _site/ with nginx as an unprivileged user on port 8080.
#   docker build -t seriesoftubes .
#   docker run --rm -p 8080:8080 seriesoftubes
FROM node:24-alpine AS build
WORKDIR /src
COPY . .
RUN node scripts/build.js

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/_site /usr/share/nginx/html
EXPOSE 8080
