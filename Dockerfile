# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine

# sqlite3 requires native compilation — install build tools
RUN apk add --no-cache python3 make g++

# Working dir is the backend so relative paths (multer uploads) resolve correctly
WORKDIR /app/backend

# Install backend dependencies (includes tsx)
COPY backend/package*.json ./
RUN npm ci

# Remove build tools after install to keep image small
RUN apk del python3 make g++

# Copy backend source
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Create uploads directory for persistent image storage
RUN mkdir -p uploads

EXPOSE 3001

CMD ["./node_modules/.bin/tsx", "src/index.ts"]