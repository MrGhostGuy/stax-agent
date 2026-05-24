$r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing
Write-Host "Status: $($r.StatusCode)"
Write-Host "Length: $($r.Content.Length)"
Write-Host "Contains init: $($r.Content.Contains('function init()'))"
Write-Host "Contains onReady: $($r.Content.Contains('onReady'))"
Write-Host "Contains inline JS: $($r.Content.Contains('const API='))"
Write-Host "Script tag starts with inline: $($r.Content.Contains('<script>const'))"
Write-Host "Contains claw3d-proxy: $($r.Content.Contains('claw3d-proxy'))"
