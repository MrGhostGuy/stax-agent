const fs = require('fs');
let html = fs.readFileSync('C:\\Users\\kency\perfect-dashboard\\public\\index2.html', 'utf8');
html = html.replace(/id="page-chat" class="page active"/, 'id="page-chat" class="page"');
html = html.replace(/id="page-3doffice" class="page"/, 'id="page-3doffice" class="page active"
Nhtml = html.replace(/data-page="chat" class="nav-item active"/, 'data-page="chat" class="nav-item"');
html = html.replace(/data-page="3doffice" class="nav-item"/, 'data-page="3doffice" class="nav-item active"
Nconst navDoMatch = html.match(/function navTo(page){[\\s\S]+?^}/m);
if (navDoMatch) {
  html = html.replace(navDoMatch[0], 'function navTo(page){var pages=document.querySelectorAll(".page");var navs=document.querySelectorAll(".nav-item");var target=document.getElementById("page-"+page);if(!target)return;pages.forEach(function(p){p.classList.remove("active");p.style.display="none";p.style.opacity="0";});navs.forEach(function(n){n.classList.remove("active");});target.classList.add("active");target.style.display="flex";target.style.opacity="1";var nav=document.querySelector('.nav-item[data-page="'+page+'"]');if(nav)nav.classList.add("active");curPage=target;}');
  console.log('navTo fixed');
}
fs.writeFileSync('C:\\Users\kency\\perfect-dashboard\\public\\index2.html', html);
console.log('Done!', html.length);