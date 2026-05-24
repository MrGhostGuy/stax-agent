# Full Phase 2 Rewrite Script
# This reads the current Phase 1 file and replaces the entire game with Phase 2

import os

path = r"C:\Users\kency\Desktop\survive-r1\index.html"

# Read current Phase 1 file
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the CSS section (keep it, just add new CSS)
style_end = content.find('</style>')
css_section = content[:style_end]

# Extract just the key HTML structure markers
# We'll rebuild the JS entirely

# Find the HTML body section (after </head>, before <script>)
body_start = content.find('<body>')
script_start = content.find('<script>')

# Get the HTML body (everything between <body> and </body>)
html_body = content[body_start:script_start]

print(f"CSS section: {len(css_section)} chars")
print(f"HTML body: {len(html_body)} chars")
print(f"Total original: {len(content)} chars")

# Now build the new CSS additions
new_css = """
#minimap{position:absolute;top:36px;right:2px;width:40px;height:40px;background:rgba(0,0,0,0.6);border:1px solid #666;z-index:15;display:none;}
"""

# Insert new CSS
css_section = css_section.replace('</style>', new_css + '</style>')

# Add minimap canvas to HTML body
html_body = html_body.replace('</body>', '<canvas id="minimap" width="40" height="40"></canvas>\n</body>')

# Now build the complete new JS
new_js = open(r"C:\Users\kency\.openclaw\workspace\phase2_js.js").read()

# Combine everything
final = css_section + "\n</head>\n" + html_body + "\n" + new_js + "\n</body>\n</html>"

with open(path, 'w', encoding='utf-8') as f:
    f.write(final)

# Verify
opens = final.count('{')
closes = final.count('}')
oparens = final.count('(')
clparens = final.count(')')
print(f"\nFinal file: {len(final)} bytes")
print(f"Braces: {opens} open, {closes} close, diff {opens-closes}")
print(f"Parens: {oparens} open, {clparens} close, diff {oparens-clparens}")
print("Done!")
