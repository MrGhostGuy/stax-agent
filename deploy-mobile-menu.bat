@echo off
echo ============================================
echo  NiceGuyAPI Mobile Menu Deploy
echo ============================================
echo.
echo This will push the mobile menu + transitions to GitHub.
echo Make sure you're logged in: gh auth status
echo.
pause

echo [1/3] Generating modified HTML...
node niceguyapi-deploy-fix.js

echo.
echo [2/3] Getting SHA...
for /f "delims=" %%i in ('gh api repos/MrGhostGuy/niceguyapi/contents/index.html --jq ".sha"') do set SHA=%%i
echo SHA: %SHA%

echo.
echo [3/3] Pushing to GitHub...
node -e "const fs=require('fs'); const h=fs.readFileSync('index.html','utf8'); const b=Buffer.from(h).toString('base64'); require('child_process').execSync('gh api --method PUT repos/MrGhostGuy/niceguyapi/contents/index.html -f message=\"feat: mobile hamburger menu + premium tab transitions\" -f content=\"'+b+'\" -f sha=\"%SHA%\" -f',{stdio:'inherit'})"

echo.
echo ============================================
echo  DEPLOYED! 
echo  https://mrghostguy.github.io/niceguyapi/
echo ============================================
pause
