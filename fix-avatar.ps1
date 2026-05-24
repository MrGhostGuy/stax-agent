$js = Get-Content "C:\Users\kency\perfect-dashboard\public\app.js" -Raw

// 1. Add smoke element creation before the click listener
$oldLine = "avatarEl.addEventListener('click',()=>{"
$newBlock = @"
// Add smoke element for smoking state
const smokeEl=document.createElement('div');
smokeEl.className='jorm-smoke';
smokeEl.style.display='none';
const jormBody=document.querySelector('.jorm-body');
if(jormBody)jormBody.appendChild(smokeEl);

function updateSmoke(){
  if(!smokeEl)return;
  smokeEl.style.display=avatarState==='smoking'?'block':'none';
}

avatarEl.addEventListener('click',()=>{
"@

$js = $js.Replace($oldLine, $newBlock)

// 2. Update setAvatarState to call updateSmoke
$js = $js.Replace("scheduleRandomIdle();`r`n}", "scheduleRandomIdle();`r`n  updateSmoke();`r`n}")
// Also handle LF-only line endings
$js = $js.Replace("scheduleRandomIdle();`n}", "scheduleRandomIdle();`n  updateSmoke();`n}")

$js | Set-Content "C:\Users\kency\perfect-dashboard\public\app.js" -NoNewline
Write-Host "Avatar JS updated with smoke element"
