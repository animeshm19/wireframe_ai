#!/bin/bash

# --- CONFIGURATION ---
PROJECT_ID="wireframe-v1"
REGION="us-central1"
WORKER_SERVICE_NAME="wireframe-worker"
STORAGE_BUCKET="wireframe-v1.firebasestorage.app"

# --- SECRETS MANAGEMENT ---
# 1. Try to load from a local .env file (if it exists)
if [ -f .env ]; then
  echo "Loading secrets from .env file..."
  export $(grep -v '^#' .env | xargs)
fi

# 2. Verify secrets are present
if [ -z "$GEMINI_API_KEY" ]; then
  echo "❌ Error: GEMINI_API_KEY is missing."
  echo "Please set it in your environment or add it to a .env file."
  exit 1
fi

# (CAD_WORKER_SECRET is likely not needed anymore with the new architecture, 
# but if you still use it, ensure it's checked here too)

echo "=================================================="
echo "🚀 STARTING DEPLOYMENT FOR $PROJECT_ID"
echo "=================================================="

# 1. DEPLOY WORKER
echo ""
echo "📦 Deploying CAD Worker to Cloud Run..."
cd cad-worker

# Deploy using the environment variable
gcloud run deploy $WORKER_SERVICE_NAME \
  --source . \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="$GEMINI_API_KEY",FIREBASE_STORAGE_BUCKET="$STORAGE_BUCKET"

echo "✅ Worker deployed."
cd ..

# NOTE: Steps 2, 3, and 4 (Cloud Functions/DataConnect) have been removed 
# because you deleted those folders in the previous migration steps.
# The Frontend + Firestore + Cloud Run Worker architecture doesn't use them.

echo ""
echo "=================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=================================================="