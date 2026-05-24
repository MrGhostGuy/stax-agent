$html = Get-Content "C:\Users\kency\perfect-dashboard\public\index.html" -Raw

$newAvatarCss = @'
.jorm-avatar.eating .jorm-eye{animation:none;width:8px;height:10px;top:10px}
.jorm-avatar.eating .jorm-mouth{width:20px;height:10px;border-radius:3px 3px 10px 10px;animation:chew .4s infinite}
.jorm-avatar.eating .jorm-head::after{background:#ff8800;box-shadow:0 0 10px #ff8800}
.jorm-avatar.eating .jorm-torso::after{background:#ff8800;box-shadow:0 0 6px #ff8800}
@keyframes chew{0%,100%{height:10px;width:20px}50%{height:6px;width:16px}}
.jorm-avatar.smoking .jorm-eye{height:4px;top:14px;opacity:.8}
.jorm-avatar.smoking .jorm-mouth{width:10px;height:6px;border-radius:50%}
.jorm-avatar.smoking .jorm-head::after{background:#888;box-shadow:0 0 6px rgba(136,136,136,.5)}
.jorm-avatar.smoking .jorm-torso::after{background:#888;box-shadow:0 0 4px rgba(136,136,136,.4)}
.jorm-avatar.smoking .jorm-smoke{position:absolute;top:-28px;left:60%;transform:translateX(-50%);width:8px;height:8px;background:rgba(200,200,200,.4);border-radius:50%;animation:smokeRise 2s infinite}
.jorm-avatar.smoking .jorm-smoke::before{content:'';position:absolute;top:-12px;left:4px;width:6px;height:6px;background:rgba(200,200,200,.25);border-radius:50%;animation:smokeRise 2s .5s infinite}
.jorm-avatar.smoking .jorm-smoke::after{content:'';position:absolute;top:-22px;left:0;width:5px;height:5px;background:rgba(200,200,200,.15);border-radius:50%;animation:smokeRise 2s 1s infinite}
@keyframes smokeRise{0%{opacity:.6;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-20px) scale(2)}}
.jorm-avatar.angry .jorm-eye{background:#ff3355;box-shadow:0 0 8px var(--red);animation:angryBlink .3s infinite}
.jorm-avatar.angry .jorm-eye::after{display:none}
.jorm-avatar.angry .jorm-mouth{width:18px;height:4px;border-radius:0;transform:translateX(-50%) rotate(10deg)}
.jorm-avatar.angry .jorm-head{border-color:var(--red);box-shadow:0 0 12px rgba(255,51,85,.4)}
.jorm-avatar.angry .jorm-head::after{background:var(--red);box-shadow:0 0 10px var(--red);animation:angryPulse .5s infinite}
.jorm-avatar.angry .jorm-torso{border-color:var(--red)}
.jorm-avatar.angry .jorm-torso::after{background:var(--red);box-shadow:0 0 8px var(--red);animation:angryHeartBeat .4s infinite}
.jorm-avatar.angry .jorm-arm-l{animation:angryShake .2s infinite}
.jorm-avatar.angry .jorm-arm-r{animation:angryShake .2s .1s infinite}
.jorm-avatar.angry .jorm-leg-l,.jorm-avatar.angry .jorm-leg-r{border-color:var(--red)}
@keyframes angryBlink{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.3)}}
@keyframes angryPulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes angryHeartBeat{0%,100%{transform:translateX(-50%) scale(1)}25%{transform:translateX(-50%) scale(1.4)}50%{transform:translateX(-50%) scale(.9)}75%{transform:translateX(-50%) scale(1.2)}}
@keyframes angryShake{0%,100%{transform:rotate(-15deg)}50%{transform:rotate(15deg)}}
'@

# Smoking smoke element needs to be in the HTML - we add it via JS instead
# Just insert the CSS before the mobile media query
$insertPoint = $html.IndexOf("@media(max-width:900px)")
if ($insertPoint -ge 0) {
    $html = $html.Substring(0, $insertPoint) + $newAvatarCss + "`n" + $html.Substring($insertPoint)
    $html | Set-Content "C:\Users\kency\perfect-dashboard\public\index.html" -NoNewline
    Write-Host "Avatar CSS added successfully"
} else {
    Write-Host "Insert point not found"
}
