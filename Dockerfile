FROM jubianchi/docker-node-4

VOLUME /updates

COPY ./lib /app/lib
COPY ./package.json /app/package.json
COPY ./.babelrc /app/.babelrc

WORKDIR /app
RUN npm install && \
    npm run build && \
    rm -rf /app/lib /app/node_modules && \
    mv /app/compiled /app/lib

ENV NODE_ENV=production

RUN npm install

RUN mkdir updates

VOLUME /app/updates

EXPOSE 8080

ENTRYPOINT /node-v4.1.0-linux-x64/bin/node /app/lib/index.js
