<#
.SYNOPSIS
    Cross-Platform Sync Helper for algo-code-latest (Windows PowerShell)
.DESCRIPTION
    Pulls the latest code from GitHub and pushes any local changes.
#>

param (
    [string]$Action = "all",
    [string]$Message = ""
)

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$Branch = (git rev-parse --abbrev-ref HEAD).Trim()
Write-Host "==> Repository: $RepoRoot" -ForegroundColor Cyan
Write-Host "==> Current Branch: $Branch" -ForegroundColor Yellow

function Sync-Pull {
    Write-Host "`n[1/2] Fetching and pulling latest changes from GitHub ($Branch)..." -ForegroundColor Cyan
    
    $hasDirty = (git status --porcelain)
    if ($hasDirty) {
        Write-Host ">> Local uncommitted changes detected. Auto-stashing before pull..." -ForegroundColor Yellow
        git stash push -u -m "auto-sync-stash"
    }

    git fetch origin $Branch
    git pull --rebase origin $Branch
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to pull latest changes from GitHub."
        if ($hasDirty) { git stash pop }
        exit $LASTEXITCODE
    }
    Write-Host "[OK] Local repository is up to date." -ForegroundColor Green

    if ($hasDirty) {
        Write-Host ">> Restoring local uncommitted changes..." -ForegroundColor Yellow
        git stash pop
    }
}

function Sync-Push {
    Write-Host "`n[2/2] Checking local commits and changes to push..." -ForegroundColor Cyan
    $status = git status --porcelain
    if ($status) {
        if (-not $Message) {
            $dateStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $Message = "sync: updates from Desktop ($dateStr)"
        }
        Write-Host ">> Committing local changes: '$Message'..." -ForegroundColor Yellow
        git add -A
        git commit -m $Message
    }

    $ahead = (git rev-list --count "origin/$Branch..HEAD" 2>$null)
    if ($ahead -and [int]$ahead -gt 0) {
        Write-Host ">> Pushing $ahead commit(s) to GitHub ($Branch)..." -ForegroundColor Yellow
        git push origin $Branch
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to push to GitHub."
            exit $LASTEXITCODE
        }
        Write-Host "[OK] Successfully pushed all changes to GitHub!" -ForegroundColor Green
    } else {
        Write-Host "[OK] No new commits to push." -ForegroundColor Green
    }
}

switch ($Action.ToLower()) {
    "pull" { Sync-Pull }
    "push" { Sync-Push }
    default {
        Sync-Pull
        Sync-Push
    }
}

Write-Host "`n[OK] Git synchronization complete!`n" -ForegroundColor Green
