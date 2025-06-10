#!/bin/bash

# Splunk MCP Server Validation Script
# This script validates the project setup and ensures everything is working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Track validation results
TOTAL_CHECKS=0
PASSED_CHECKS=0

check() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if eval "$1"; then
        print_status "$2"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        print_error "$2"
        return 1
    fi
}

print_header "Splunk MCP Server Project Validation"

print_header "Environment Checks"

# Check Node.js
check "command -v node &> /dev/null" "Node.js is installed"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_info "Node.js version: $NODE_VERSION"
    
    # Check Node.js version is 18+
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    check "[ $NODE_MAJOR -ge 18 ]" "Node.js version is 18 or higher"
fi

# Check pnpm
check "command -v pnpm &> /dev/null" "pnpm is installed"
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    print_info "pnpm version: $PNPM_VERSION"
fi

print_header "Project Structure Checks"

# Check required files
check "[ -f package.json ]" "package.json exists"
check "[ -f tsconfig.json ]" "tsconfig.json exists"
check "[ -f src/index.ts ]" "Main server file exists"
check "[ -f src/types/splunk-sdk.d.ts ]" "Type declarations exist"
check "[ -f README.md ]" "README.md exists"
check "[ -f MCP_SETUP.md ]" "MCP setup guide exists"
check "[ -f start.sh ]" "Startup script exists"
check "[ -x start.sh ]" "Startup script is executable"

# Check required directories
check "[ -d src ]" "Source directory exists"
check "[ -d examples ]" "Examples directory exists"

print_header "Dependencies Check"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_status "Dependencies are installed"
    
    # Check key dependencies
    check "[ -d node_modules/@modelcontextprotocol/sdk ]" "MCP SDK is installed"
    check "[ -d node_modules/splunk-sdk ]" "Splunk SDK is installed"
    check "[ -d node_modules/zod ]" "Zod is installed"
    check "[ -d node_modules/typescript ]" "TypeScript is installed"
else
    print_warning "Dependencies not installed. Run 'pnpm install' first."
fi

print_header "Build Check"

if [ -d "dist" ]; then
    print_status "Project has been built"
    check "[ -f dist/index.js ]" "Main build artifact exists"
else
    print_warning "Project not built. Run 'pnpm run build' first."
fi

print_header "Code Quality Checks"

# Check TypeScript compilation
if command -v pnpm &> /dev/null && [ -d "node_modules" ]; then
    if pnpm run build > /dev/null 2>&1; then
        print_status "TypeScript compiles without errors"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_error "TypeScript compilation failed"
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

print_header "Testing"

# Run tests if possible
if command -v pnpm &> /dev/null && [ -d "node_modules" ] && [ -d "dist" ]; then
    if pnpm run test > /dev/null 2>&1; then
        print_status "All tests pass"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_error "Some tests failed"
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

print_header "Security Checks"

# Check for common security issues
check "! grep -r 'password.*=.*[\"'\''][^\"'\'']*[\"'\'']' src/ --include='*.ts' | grep -v 'describe\|z\.string'" "No hardcoded passwords in source"
check "! grep -r 'secret.*=.*[\"'\''][^\"'\'']*[\"'\'']' src/ --include='*.ts' | grep -v 'describe\|z\.string'" "No hardcoded secrets in source"
check "[ -f .gitignore ]" ".gitignore exists"

if [ -f .gitignore ]; then
    check "grep -q 'config.json' .gitignore" "Config files are ignored by git"
    check "grep -q '\.env' .gitignore" "Environment files are ignored by git"
fi

print_header "Configuration Validation"

# Check example config
check "[ -f config.example.json ]" "Example configuration exists"

if [ -f config.example.json ]; then
    if command -v node &> /dev/null; then
        if node -e "JSON.parse(require('fs').readFileSync('config.example.json', 'utf8'))" 2>/dev/null; then
            print_status "Example configuration is valid JSON"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            print_error "Example configuration is invalid JSON"
        fi
        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    fi
fi

print_header "Documentation Checks"

# Check README completeness
if [ -f README.md ]; then
    check "grep -q 'Installation' README.md" "README contains installation instructions"
    check "grep -q 'Usage' README.md" "README contains usage instructions"
    check "grep -q 'Examples' README.md" "README contains examples"
fi

# Check MCP setup guide
if [ -f MCP_SETUP.md ]; then
    check "grep -q 'Configuration' MCP_SETUP.md" "MCP setup guide contains configuration instructions"
    check "grep -q 'Troubleshooting' MCP_SETUP.md" "MCP setup guide contains troubleshooting section"
fi

print_header "Final Validation Summary"

echo ""
print_info "Validation Results: $PASSED_CHECKS/$TOTAL_CHECKS checks passed"

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    print_status "🎉 All validation checks passed! The project is ready to use."
    echo ""
    print_info "Next steps:"
    echo "  1. Configure your Splunk connection using the 'configure' tool"
    echo "  2. Add the server to your MCP client configuration"
    echo "  3. Start searching with Splunk!"
    echo ""
    exit 0
elif [ $PASSED_CHECKS -gt $((TOTAL_CHECKS * 3 / 4)) ]; then
    print_warning "⚠️  Most checks passed, but some issues need attention."
    echo ""
    print_info "The project should work, but consider fixing the failing checks."
    exit 1
else
    print_error "❌ Several validation checks failed."
    echo ""
    print_info "Please address the failing checks before using the project."
    exit 2
fi