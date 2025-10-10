#!/bin/bash
set -e

echo "🚀 Memora Setup Script"
echo "======================"
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Installing pnpm..."
    npm install -g pnpm
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚙️  Creating .env.local from example..."
    cp infrastructure/example.env .env.local
    echo "✅ Created .env.local"
    echo "⚠️  Please edit .env.local and add your API keys:"
    echo "   - OPENAI_API_KEY"
    echo "   - ELEVENLABS_API_KEY"
    echo "   - FIREWORKS_API_KEY"
    echo "   - GCP_PROJECT_ID"
    echo "   - GCS_BUCKET"
    echo ""
else
    echo "✅ .env.local already exists"
fi

# Check if Elasticsearch is running
echo "🔍 Checking Elasticsearch..."
if curl -s http://localhost:9200 > /dev/null 2>&1; then
    echo "✅ Elasticsearch is running"
else
    echo "⚠️  Elasticsearch not detected on localhost:9200"
    echo "   Start it with:"
    echo "   docker run -d --name memora-es -p 9200:9200 -e \"discovery.type=single-node\" -e \"xpack.security.enabled=false\" docker.elastic.co/elasticsearch/elasticsearch:8.15.0"
    echo ""
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local and add your API keys"
echo "2. Start Elasticsearch (if not running)"
echo "3. Run: pnpm create-index"
echo "4. Run: pnpm seed"
echo "5. Run: pnpm dev"
echo ""
echo "See QUICKSTART.md for detailed instructions."
