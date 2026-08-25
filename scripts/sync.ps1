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
    git fetch origin $Branch
    git pull --rebase origin $Branch
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to pull latest changes from GitHub."
        exit $LASTEXITCODE
    }
    Write-Host "✓ Local repository is up to date." -ForegroundColor Green
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
        Write-Host "✓ Successfully pushed all changes to GitHub!" -ForegroundColor Green
    } else {
        Write-Host "✓ No new commits to push." -ForegroundColor Green
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

Write-Host "`n★ Git synchronization complete!`n" -ForegroundColor Green
