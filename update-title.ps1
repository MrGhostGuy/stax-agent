$html = Get-Content 'C:\Users\kency\perfect-dashboard\public\index.html' -Raw -Encoding UTF8
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$html = $html -replace '<title>PERFECT DASHBOARD', "<title>PERFECT DASHBOARD v$timestamp"
[System.IO.File]::WriteAllText('C:\Users\kency\perfect-dashboard\public\index.html', $html, [System.Text.Encoding]::UTF8)
Write-Host "Updated title with timestamp: $timestamp"
