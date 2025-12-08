#!/bin/bash

# --- CONFIGURATION ---
# Replace these with your actual values once
PROJECT_ID="wireframe-v1"
REGION="us-central1"
WORKER_SERVICE_NAME="wireframe-worker"

# Secrets (You can also set these as environment variables on your machine)
# Replace with your actual keys
GEMINI_API_KEY="AIzaSyDhDf0ZaUpK_ezcj6HAA_aoxK_EId0omxk"
CAD_WORKER_SECRET="bcba184da7569fe3a9cddd0b3940abbf18012d15f4e8957ab37a8c5e7e1c1855"
STORAGE_BUCKET="wireframe-v1.firebasestorage.app"

echo "=================================================="
echo "🚀 STARTING DEPLOYMENT FOR $PROJECT_ID"
echo "=================================================="

# 1. DEPLOY WORKER
echo ""
echo "📦 Deploying CAD Worker to Cloud Run..."
cd cad-worker

# We capture the output URL automatically using some bash magic
gcloud run deploy $WORKER_SERVICE_NAME \
  --source . \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --set-env-vars CAD_WORKER_SECRET=$CAD_WORKER_SECRET,GEMINI_API_KEY=$GEMINI_API_KEY,FIREBASE_STORAGE_BUCKET=$STORAGE_BUCKET

# Get the URL of the deployed service
WORKER_URL=$(gcloud run services describe $WORKER_SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo "✅ Worker deployed at: $WORKER_URL"
cd ..

# 2. CONFIGURE BACKEND
echo ""
echo "🔗 Linking Worker to Cloud Functions..."

# Create/Overwrite the .env file for functions with the new URL
cat > functions/.env <<EOF
CAD_WORKER_URL=$WORKER_URL
CAD_WORKER_SECRET=$CAD_WORKER_SECRET
EOF

# 3. DEPLOY DATABASE SCHEMA (Safety check)
echo ""
echo "🗄️  Checking Database Schema..."
firebase deploy --only dataconnect

# 4. DEPLOY FUNCTIONS
echo ""
echo "⚡ Deploying Orchestrator (Cloud Functions)..."
firebase deploy --only functions

echo ""
echo "=================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "🌍 App is live."
echo "=================================================="