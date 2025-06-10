#!/bin/bash

# Splunk MCP Server Startup Script
# This script builds and starts the Splunk MCP Server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

print_status "Starting Splunk MCP Server setup..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    pnpm install
else
    print_status "Dependencies already installed"
fi

# Build the project if dist doesn't exist or src is newer
if [ ! -d "dist" ] || [ "src" -nt "dist" ]; then
    print_status "Building the project..."
    pnpm run build
else
    print_status "Project already built"
fi

# Run tests to ensure everything is working
print_status "Running tests..."
if pnpm run test > /dev/null 2>&1; then
    print_status "All tests passed"
else
    print_warning "Some tests failed, but continuing..."
fi

print_status "Starting Splunk MCP Server..."
print_status "Server will communicate via stdio"
print_status "Press Ctrl+C to stop the server"

# Start the server
exec node dist/index.js