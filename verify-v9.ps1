$r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing
Write-Host "Status: $($r.StatusCode)"
Write-Host "Length: $($r.Content.Length)"
Write-Host "Contains v9: $($r.Content.Contains('v9.0'))"
Write-Host "Contains console.log: $($r.Content.Contains('PERFECT DASHBOARD v9.0 LOADED'))"
Write-Host "Contains onReady: $($r.Content.Contains('onReady'))"
Write-Host "Contains claw3d-proxy: $($r.Content.Contains('claw3d-proxy'))"
