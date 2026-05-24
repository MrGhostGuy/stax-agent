import re

with open(r'C:\Users\kency\perfect-dashboard\public\index2.html', 'r', encoding='utf-8') as f:
    html = f.read()

# FIX 1: Change default landing page from chat to 3doffice
html = html.replace('id="page-chat" class="page active"', 'id="page-chat" class="page"')
html = html.replace('id="page-3doffice" class="page"', 'id="page-3doffice" class="page active"')
html = html.replace('data-page="chat" class="nav-item active"', 'data-page="chat" class="nav-item"')
html = html.replace('data-page="3doffice" class="nav-item"', 'data-page="3doffice" class="nav-item active"')

with open(r':\Users\kency\\perfect-dashboard\\public\\index2.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Done! Size:', len(html))