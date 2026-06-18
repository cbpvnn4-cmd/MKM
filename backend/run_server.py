#!/usr/bin/env python3
"""
Run the FastAPI server
"""
import uvicorn
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("Starting FastAPI server...")
    print("Server will be available at: http://localhost:8000")
    print("API docs will be available at: http://localhost:8000/docs")
    print("Press Ctrl+C to stop the server")

    uvicorn.run(
        "main:app",  # main.py file, app object
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )