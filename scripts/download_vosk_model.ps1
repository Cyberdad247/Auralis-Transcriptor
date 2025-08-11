# Downloads a small English Vosk model into .\models\vosk
# Usage: pwsh -File scripts\download_vosk_model.ps1

$ErrorActionPreference = "Stop"

$ModelDir = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\models\vosk"
New-Item -ItemType Directory -Force -Path $ModelDir | Out-Null

$Url = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
$Zip = Join-Path $ModelDir "model.zip"

Invoke-WebRequest -Uri $Url -OutFile $Zip

# Extract zip
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($Zip, $ModelDir, $true)

# Normalize folder name
$subdir = Get-ChildItem -Path $ModelDir -Directory | Where-Object { $_.Name -like "vosk-model-*" } | Select-Object -First 1
if ($null -eq $subdir) {
  throw "Extracted model directory not found"
}

$Current = Join-Path $ModelDir "current"
if (Test-Path $Current) { Remove-Item -Recurse -Force $Current }
Move-Item -Force $subdir.FullName $Current

Remove-Item -Force $Zip
Write-Host "Vosk model installed at $Current"

