# Deterministic asset extraction. Never redraw or recolor the approved artwork.
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot 'assets/branding/quarryone-logo.png'
$source = [System.Drawing.Image]::FromFile($sourcePath)
try {
    if ($source.Width -ne 1254 -or $source.Height -ne 1254) {
        throw 'Approved artwork dimensions changed. Review the emblem crop before regenerating.'
    }
    # The emblem ends above y=940; the wordmark starts below it.
    $crop = [System.Drawing.Rectangle]::new(190, 100, 840, 840)
    foreach ($asset in @(
        @{ Name = 'quarryone-icon.png'; Size = 720 },
        @{ Name = 'quarryone-adaptive-foreground.png'; Size = 576 }
    )) {
        $canvas = [System.Drawing.Bitmap]::new(1024, 1024)
        $graphics = [System.Drawing.Graphics]::FromImage($canvas)
        try {
            $graphics.Clear([System.Drawing.Color]::White)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $offset = (1024 - $asset.Size) / 2
            $destination = [System.Drawing.Rectangle]::new($offset, $offset, $asset.Size, $asset.Size)
            $graphics.DrawImage($source, $destination, $crop, [System.Drawing.GraphicsUnit]::Pixel)
            $canvas.Save((Join-Path $projectRoot ('assets/branding/' + $asset.Name)), [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
            $graphics.Dispose()
            $canvas.Dispose()
        }
    }
} finally {
    $source.Dispose()
}
