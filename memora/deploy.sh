#!/bin/bash

# Memora Vercel Deployment Script

echo "🚀 Deploying Memora to Vercel..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if logged in
echo "🔐 Checking Vercel authentication..."
vercel whoami || vercel login

echo ""
echo "📦 Building and deploying..."
echo ""

# Deploy to Vercel
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Set environment variables in Vercel dashboard"
echo "  2. Configure GCS CORS for your Vercel domain"
echo "  3. Update Elasticsearch security settings"
echo "  4. Test your deployment"
echo ""
echo "📖 See VERCEL_DEPLOYMENT.md for detailed instructions"
