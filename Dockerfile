# Builds the game the same way the release does (scripts/build.sh) and serves
# _site/ with nginx as an unprivileged user on port 8080.
#   docker build -t seriesoftubes .
#   docker run --rm -p 8080:8080 seriesoftubes
FROM node:24-alpine AS build
RUN apk add --no-cache bash
WORKDIR /src
COPY . .
# Windows checkouts may carry CRLF, which bash refuses to run.
RUN sed -i 's/\r$//' scripts/build.sh && bash scripts/build.sh

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/_site /usr/share/nginx/html
EXPOSE 8080
