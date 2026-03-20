# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production image
# Use full Debian-based image — has Python/make/g++ needed for sqlite3
FROM node:20

WORKDIR /app/backend

# Install backend dependencies (npm install instead of ci — avoids Windows lock file platform issues)
COPY backend/package.json ./
RUN npm install

# Copy backend source
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Create uploads directory for persistent image storage
RUN mkdir -p uploads

EXPOSE 3001

CMD ["./node_modules/.bin/tsx", "src/index.ts"]