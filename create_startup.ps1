echo Creating startup shortcut...

$startupDir = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$shortcutPath = "$startupDir\PerfectDashboard.lnk"

# Remove existing if present
if (Test-Path $shortcutPath) { Remove-Item $shortcutPath -Force }

# Create new shortcut
$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"C:\Users\kency\perfect-dashboard\start-all.ps1`""
$shortcut.WorkingDirectory = "C:\Users\kency\perfect-dashboard"
$shortcut.Description = "Auto-start Perfect Dashboard + Claw3D"
$shortcut.Save()

Write-Host "Startup shortcut created: $shortcutPath"

# Verify
if (Test-Path $shortcutPath) {
    $verify = $ws.CreateShortcut($shortcutPath)
    Write-Host "Target: $($verify.TargetPath)"
    Write-Host "Args: $($verify.Arguments)"
    Write-Host "OK!"
} else {
    Write-Host "FAILED!"
}
