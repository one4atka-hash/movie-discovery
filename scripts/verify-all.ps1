# Full regression: movie-discovery (build, lint, test:ci) + server (build, lint, test).
# Run from repo root: pwsh -File scripts/verify-all.ps1
# Unix/macOS/CI: sh scripts/verify-all.sh
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Invoke-Step([string] $Dir, [scriptblock] $Block) {
  Push-Location (Join-Path $root $Dir)
  try {
    & $Block
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } finally {
    Pop-Location
  }
}

Invoke-Step 'movie-discovery' {
  npm run build
  npm run lint
  npm run test:ci
}

Invoke-Step 'server' {
  npm run build
  npm run lint
  npm test
}

Write-Host 'OK: verify-all completed.'
