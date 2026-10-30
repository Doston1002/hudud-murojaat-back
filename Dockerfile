FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* ./
RUN npm install --omit=dev=false
COPY tsconfig.json nest-cli.json ./
COPY src ./src
COPY assets ./assets
RUN npm run build
EXPOSE 4000
CMD ["node", "dist/main.js"]
