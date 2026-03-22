# UnoRouter - Claude Code CLI Setup Script (PowerShell)
# This script configures Claude Code to use UnoRouter as the API endpoint.

$API_URL = "https://api.unorouter.ai"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  UnoRouter - Claude Code Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$API_KEY = Read-Host "Enter your UnoRouter API Key"

if ([string]::IsNullOrWhiteSpace($API_KEY)) {
    Write-Host "Error: API Key cannot be empty." -ForegroundColor Red
    exit 1
}

# Set user-level environment variables
[Environment]::SetEnvironmentVariable('ANTHROPIC_BASE_URL', $API_URL, 'User')
[Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', $API_KEY, 'User')

# Set for current session
$env:ANTHROPIC_BASE_URL = $API_URL
$env:ANTHROPIC_API_KEY = $API_KEY

Write-Host ""
Write-Host "Environment variables set successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "ANTHROPIC_BASE_URL = $API_URL" -ForegroundColor Yellow
Write-Host "ANTHROPIC_API_KEY  = $($API_KEY.Substring(0, [Math]::Min(8, $API_KEY.Length)))..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Changes apply to new terminal windows automatically." -ForegroundColor White
Write-Host "Run 'claude' to start using Claude Code with UnoRouter." -ForegroundColor White
Write-Host ""
