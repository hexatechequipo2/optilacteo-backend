FROM node:20-alpine AS build
RUN apk add --no-cache python3 make g++ tzdata
ENV TZ=America/Argentina/Buenos_Aires
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache tzdata
ENV TZ=America/Argentina/Buenos_Aires
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY scripts/docker-start.sh ./scripts/docker-start.sh
EXPOSE 3000
CMD ["sh", "scripts/docker-start.sh"]