#!/bin/bash
################################################################################
# Release Helper Script
# Automates version bumping and release creation
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}==>${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "VERSION" ]; then
    log_error "VERSION file not found. Please run this script from server-setup-generator directory."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(cat VERSION)
log_info "Current version: $CURRENT_VERSION"

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Ask for version bump type
echo ""
echo "Select version bump type:"
echo "1) Patch (${MAJOR}.${MINOR}.$((PATCH + 1))) - Bug fixes"
echo "2) Minor (${MAJOR}.$((MINOR + 1)).0) - New features, backwards compatible"
echo "3) Major ($((MAJOR + 1)).0.0) - Breaking changes"
echo "4) Custom version"
echo "5) Cancel"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
        TYPE="patch"
        ;;
    2)
        NEW_VERSION="${MAJOR}.$((MINOR + 1)).0"
        TYPE="minor"
        ;;
    3)
        NEW_VERSION="$((MAJOR + 1)).0.0"
        TYPE="major"
        ;;
    4)
        read -p "Enter new version (e.g., 1.2.3): " NEW_VERSION
        TYPE="custom"
        ;;
    5)
        log_info "Cancelled"
        exit 0
        ;;
    *)
        log_error "Invalid choice"
        exit 1
        ;;
esac

log_info "New version: $NEW_VERSION"

# Confirm
echo ""
read -p "Create release v${NEW_VERSION}? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    log_info "Cancelled"
    exit 0
fi

# Update VERSION file
log_step "Updating VERSION file..."
echo "$NEW_VERSION" > VERSION
git add VERSION

# Commit version bump
log_step "Creating version bump commit..."
git commit -m "Bump version to v${NEW_VERSION}"

# Create git tag
log_step "Creating git tag v${NEW_VERSION}..."
git tag -a "v${NEW_VERSION}" -m "Release version ${NEW_VERSION}"

# Show what will be pushed
echo ""
log_info "Ready to push. This will:"
echo "  - Push commits to origin"
echo "  - Push tag v${NEW_VERSION}"
echo "  - Trigger GitHub Actions to:"
echo "    * Build Docker image"
echo "    * Create GitHub Release"
echo "    * Publish to GHCR"
echo ""

read -p "Push now? (y/N): " push_confirm
if [[ $push_confirm =~ ^[Yy]$ ]]; then
    log_step "Pushing to origin..."
    git push origin
    git push origin "v${NEW_VERSION}"

    echo ""
    log_info "✅ Release v${NEW_VERSION} created successfully!"
    echo ""
    echo "GitHub Actions will now:"
    echo "  1. Build Docker image with tags:"
    echo "     - ghcr.io/smartynov/servup:v${NEW_VERSION}"
    echo "     - ghcr.io/smartynov/servup:${NEW_VERSION}"
    echo "     - ghcr.io/smartynov/servup:latest"
    echo "  2. Create GitHub Release at:"
    echo "     https://github.com/smartynov/servup/releases/tag/v${NEW_VERSION}"
    echo ""
    log_info "Monitor progress at: https://github.com/smartynov/servup/actions"
else
    log_warn "Not pushed. You can push manually later with:"
    echo "  git push origin"
    echo "  git push origin v${NEW_VERSION}"
fi
