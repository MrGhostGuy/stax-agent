$js = Get-Content 'C:\Users\kency\perfect-dashboard\public\app.js' -Raw -Encoding UTF8
$html = Get-Content 'C:\Users\kency\perfect-dashboard\public\index.html' -Raw -Encoding UTF8

$idx = $html.IndexOf('<script></script>')
if ($idx -eq -1) {
    Write-Host "Empty script tag not found, trying with src..."
    $idx = $html.IndexOf('<script src=')
    if ($idx -eq -1) {
        Write-Host "No script tag found at all!"
        exit 1
    }
    $endIdx = $html.IndexOf('</script>', $idx)
    $before = $html.Substring(0, $idx)
    $after = $html.Substring($endIdx + 9)
} else {
    $before = $html.Substring(0, $idx)
    $after = $html.Substring($idx + 18)  # length of '<script></script>'
}

$newHtml = $before + '<script>' + $js + '</script>' + $after

[System.IO.File]::WriteAllText('C:\Users\kency\perfect-dashboard\public\index.html', $newHtml, [System.Text.Encoding]::UTF8)
Write-Host "Done. HTML size: $($newHtml.Length)"
