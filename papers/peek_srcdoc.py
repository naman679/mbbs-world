import re
import html

filename = "CEREB_ENT.html"
with open(filename, 'r', encoding='utf-8') as f:
    content = f.read()

matches = re.finditer(r'<iframe[^>]*srcdoc="([^"]*)"[^>]*>', content)
for i, m in enumerate(matches):
    srcdoc = html.unescape(m.group(1))
    print(f"Iframe {i} head:")
    print(srcdoc[:1000])
    break
