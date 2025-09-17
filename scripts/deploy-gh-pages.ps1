# Deploy current branch (typically `main`) to the gh-pages branch
# Usage: run from the repository root in PowerShell
# 1. Ensure your working tree is clean and committed
# 2. Run this script to push the current HEAD to `gh-pages`
# 3. In GitHub repo Settings → Pages, set the source to branch `gh-pages` / folder `/`

$ErrorActionPreference = 'Stop'

Write-Host "Deploying current branch to gh-pages..."

# Ensure clean working tree
try {
    git diff --quiet --ignore-submodules HEAD
} catch {
    Write-Error "Working tree has uncommitted changes. Commit or stash before deploying."
    exit 1
}

# Force push current HEAD to gh-pages branch on origin
$pushCmd = 'git push origin HEAD:gh-pages --force'
Write-Host "Running: $pushCmd"
Invoke-Expression $pushCmd

Write-Host "Push complete. In GitHub: Settings → Pages, set source to branch 'gh-pages' and folder '/'."
Write-Host "Allow a minute for Pages to publish; then open the URL shown in Settings."