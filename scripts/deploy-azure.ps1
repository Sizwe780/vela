param(
  [string]$ResourceGroup = "vela-prod-rg",
  [string]$AppName = "vela-web-app"
)

$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $appRoot
try {
  $settings = az webapp config appsettings list --resource-group $ResourceGroup --name $AppName --output json | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw "Could not read Azure configuration." }
  foreach ($key in @("DATABASE_URL", "NEON_AUTH_BASE_URL", "NEON_AUTH_COOKIE_SECRET")) {
    $setting = $settings | Where-Object name -eq $key
    if ([string]::IsNullOrWhiteSpace($setting.value)) { throw "Configure $key in Azure before deploying." }
  }
  python scripts/package-azure.py
  if ($LASTEXITCODE -ne 0) { throw "Packaging failed." }
  az webapp deploy --resource-group $ResourceGroup --name $AppName --src-path ../work/vela-azure-current.zip --type zip --clean true --restart true --async true
  if ($LASTEXITCODE -ne 0) { throw "Direct deployment failed." }
  Write-Output "Deployment submitted. Verify the Azure deployment status and the live deployment-version.json before declaring the release complete."
}
finally {
  Pop-Location
}
