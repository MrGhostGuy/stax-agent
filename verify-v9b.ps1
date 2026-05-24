$r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing
Write-Host "Status: $($r.StatusCode)"
Write-Host "Contains officeLogs at top: $($r.Content.Contains('let officeLogs={};// officeLogs moved to top'))"
Write-Host "Length: $($r.Content.Length)"
