# Build the Vite SPA, then serve the static output.
# The app talks directly to the Base44 backend over the network (via appId),
# so no server-side runtime or secrets are needed here.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
ENV PORT=10000
EXPOSE 10000
CMD ["sh", "-c", "serve -s dist -l ${PORT:-10000}"]
