#!/usr/bin/env bash
# ==============================================================================
# Cross-Platform Sync Helper for algo-code-latest (Mac / Linux)
# Synchronizes changes between Desktop and Mac via GitHub
# ==============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")"
ACTION="${1:-all}"
COMMIT_MSG="${2:-}"

echo -e "${BLUE}==>${NC} Repository: ${REPO_DIR}"
echo -e "${BLUE}==>${NC} Current Branch: ${YELLOW}${CURRENT_BRANCH}${NC}"

sync_pull() {
    echo -e "\n${BLUE}[1/2] Fetching and pulling latest changes from GitHub (${CURRENT_BRANCH})...${NC}"
    
    # Check if there are local uncommitted changes
    HAS_DIRTY_CHANGES=false
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        HAS_DIRTY_CHANGES=true
        echo -e "${YELLOW}>> Local uncommitted changes detected. Auto-stashing before pull...${NC}"
        git stash push -u -m "auto-sync-stash-$(date +%s)"
    fi

    # Pull latest with rebase
    git fetch origin "$CURRENT_BRANCH"
    git pull --rebase origin "$CURRENT_BRANCH"
    echo -e "${GREEN}✓ Successfully updated local branch with latest remote commits.${NC}"

    # Pop stash if stashed
    if [ "$HAS_DIRTY_CHANGES" = true ]; then
        echo -e "${YELLOW}>> Restoring your local uncommitted changes...${NC}"
        git stash pop || {
            echo -e "${RED}Conflict detected while restoring stash. Please resolve conflicts.${NC}"
            exit 1
        }
    fi
}

sync_push() {
    echo -e "\n${BLUE}[2/2] Checking local commits / changes to push to GitHub...${NC}"
    
    # Check if there are uncommitted changes
    if ! git diff-index --quiet HEAD -- 2>/dev/null || [ -n "$(git status --porcelain)" ]; then
        if [ -z "$COMMIT_MSG" ]; then
            COMMIT_MSG="sync: updates from $(hostname -s 2>/dev/null || echo "mac") at $(date '+%Y-%m-%d %H:%M:%S')"
        fi
        echo -e "${YELLOW}>> Staging all changes and committing: '${COMMIT_MSG}'...${NC}"
        git add -A
        git commit -m "$COMMIT_MSG"
    fi

    # Check if local is ahead of remote
    git fetch origin "$CURRENT_BRANCH"
    LOCAL_AHEAD=$(git rev-list --count "origin/${CURRENT_BRANCH}..HEAD" 2>/dev/null || echo "0")
    
    if [ "$LOCAL_AHEAD" -gt 0 ]; then
        echo -e "${YELLOW}>> Pushing ${LOCAL_AHEAD} local commit(s) to GitHub (${CURRENT_BRANCH})...${NC}"
        git push origin "$CURRENT_BRANCH"
        echo -e "${GREEN}✓ Successfully pushed all updates to GitHub!${NC}"
    else
        echo -e "${GREEN}✓ Everything is up-to-date with GitHub. Nothing new to push.${NC}"
    fi
}

case "$ACTION" in
    pull)
        sync_pull
        ;;
    push)
        sync_push
        ;;
    all|sync)
        sync_pull
        sync_push
        ;;
    *)
        echo -e "${RED}Usage: $0 [pull|push|sync] [optional commit message]${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}★ Git synchronization complete!${NC}\n"
