# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production image
FROM node:20

WORKDIR /app/backend

# Install backend deps and force sqlite3 to compile from source
# so it links against this container's GLIBC instead of a prebuilt binary
COPY backend/package.json ./
RUN npm install --build-from-source=sqlite3

# Copy backend source
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Create uploads directory for persistent image storage
RUN mkdir -p uploads

EXPOSE 3001

CMD ["./node_modules/.bin/tsx", "src/index.ts"]
