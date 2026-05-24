$html = Get-Content 'C:\Users\kency\perfect-dashboard\public\index.html' -Raw -Encoding UTF8
Write-Host "Total length: $($html.Length)"
Write-Host "Last 200 chars:"
Write-Host $html.Substring($html.Length - 200)
