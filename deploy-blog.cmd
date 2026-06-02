# Deploy Blog to GitHub Pages
# Run this when exec is approved:

node -e "const fs=require('fs'); const h=fs.readFileSync('.\\niceguyapi-blog.html','utf8'); const b=Buffer.from(h).toString('base64'); require('child_process').execSync('gh api --method PUT repos/MrGhostGuy/niceguyapi/contents/niceguyapi-blog.html -f message=\"feat: add blog with 4 articles (SEO + marketing)\" -f content=\"'+b+'\" -f branch=\"main\"',{stdio:'inherit'})"

# Then add a Blog tab to index.html navigation
