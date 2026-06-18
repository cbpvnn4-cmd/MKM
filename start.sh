#!/bin/bash

echo "🚀 Starting Elevator Management System..."

# Check if .env exists
if [ ! -f "./backend/.env" ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp ./backend/.env.example ./backend/.env
    echo "✅ Please edit ./backend/.env with your configuration"
fi

# Start PostgreSQL if not running
if ! docker ps | grep -q postgres; then
    echo "🐘 Starting PostgreSQL..."
    docker-compose up -d db
    sleep 10
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt

# Run migrations
echo "🔄 Running database migrations..."
alembic upgrade head

# Start backend
echo "🚀 Starting backend server..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Start frontend
echo "🎨 Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!

echo "✅ System started successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID