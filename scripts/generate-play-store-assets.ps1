# Generates Google Play listing images (Windows, from repo root):
#   .\scripts\generate-play-store-assets.ps1
# Outputs:
#   assets/play-store-listing/store-icon-512.png
#
# The feature graphic and screenshots are rendered by marketing/ (see marketing/README.md).
# Pass -FeatureGraphic to overwrite the feature graphic with this script's plain fallback layout.
param([switch]$FeatureGraphic)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$outDir = Join-Path $repoRoot "assets\play-store-listing"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Add-Type -AssemblyName System.Drawing

# --- 1) Store icon 512×512 ---
$iconSrcPath = Join-Path $repoRoot "assets\icon.png"
if (-not (Test-Path $iconSrcPath)) { throw "Missing assets\icon.png" }
$srcIcon = [System.Drawing.Image]::FromFile($iconSrcPath)
try {
  $out512 = New-Object System.Drawing.Bitmap 512, 512
  $g = [System.Drawing.Graphics]::FromImage($out512)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  # Use the inner rounded tile, full bleed: Play applies its own rounded mask, so the outer
  # border of assets/icon.png would otherwise show as a frame inside a frame.
  $tile = New-Object System.Drawing.Rectangle 118, 122, 788, 788
  $g.DrawImage($srcIcon, (New-Object System.Drawing.Rectangle 0, 0, 512, 512), $tile, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $iconOut = Join-Path $outDir "store-icon-512.png"
  $out512.Save($iconOut, [System.Drawing.Imaging.ImageFormat]::Png)
  $out512.Dispose()
  Write-Host "Wrote $iconOut ($([math]::Round((Get-Item $iconOut).Length / 1KB, 1)) KB)"
} finally {
  $srcIcon.Dispose()
}

# --- 2) Feature graphic 1024×500 (fallback; the designed one comes from marketing/) ---
if (-not $FeatureGraphic) {
  Write-Host "Skipped the feature graphic (marketing/ renders it). Pass -FeatureGraphic to write the fallback."
  exit 0
}
$logoPath = Join-Path $repoRoot "website\offlinemate.png"
if (-not (Test-Path $logoPath)) { throw "Missing website\offlinemate.png" }
$logo = [System.Drawing.Image]::FromFile($logoPath)
try {
  $fw = 1024
  $fh = 500
  $bmp = New-Object System.Drawing.Bitmap $fw, $fh
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.Clear([System.Drawing.Color]::FromArgb(255, 15, 23, 42))

  $maxLogoH = 360
  $scale = [Math]::Min($maxLogoH / $logo.Height, 520 / $logo.Width)
  $lw = [int][Math]::Round($logo.Width * $scale)
  $lh = [int][Math]::Round($logo.Height * $scale)
  $lx = 80
  $ly = [int](($fh - $lh) / 2)
  $g.DrawImage($logo, $lx, $ly, $lw, $lh)

  $font = New-Object System.Drawing.Font "Segoe UI", 22, ([System.Drawing.FontStyle]::Regular)
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 226, 232, 240))
  $g.DrawString("Private AI on your phone", $font, $brush, [float]($lx + $lw + 36), [float](($fh / 2) - 18))
  $font.Dispose()
  $brush.Dispose()
  $g.Dispose()

  $featOut = Join-Path $outDir "feature-graphic-1024x500.png"
  $bmp.Save($featOut, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Wrote $featOut ($([math]::Round((Get-Item $featOut).Length / 1KB, 1)) KB)"
} finally {
  $logo.Dispose()
}

Write-Host "Upload these in Play Console > Main store listing."
