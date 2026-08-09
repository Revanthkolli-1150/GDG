# ============================================================================
# MULTI-STAGE DOCKERFILE: EMERGENCY AMBULANCE DISPATCH & AUDIO TRAUMA ENGINE
# ============================================================================

# Stage 1: Build & Dependencies
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

# Stage 2: Runtime Environment with FFMPEG
FROM node:20-alpine
WORKDIR /app

# Install FFMPEG for Whisper Speech-to-Text Audio Processing
RUN apk add --no-gradient --no-cache ffmpeg python3 py3-pip

COPY --from=backend-builder /app/backend /app/backend

EXPOSE 5000 8000

CMD ["npm", "--prefix", "backend", "run", "start"]
