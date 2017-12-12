FROM mhart/alpine-node:8

WORKDIR /usr/app

RUN apk add --no-cache --virtual .yarn-deps curl gnupg && \
  curl -o- -L https://yarnpkg.com/install.sh | sh && \
  apk del .yarn-deps
COPY package.json ./
RUN yarn

COPY node_modules server.js ./

EXPOSE 3000

CMD [ "yarn", "start" ]