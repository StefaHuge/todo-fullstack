FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_FACTOR=2 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_MAXSOCKETS=3

RUN for i in 1 2 3 4 5; do \
        npm install --legacy-peer-deps && break || \
        (echo "Попытка $i не удалась, повтор через 10 секунд..." && sleep  \
    10); \
        done
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

