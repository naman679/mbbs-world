import re
import html

filename = "CEREB_ENT.html"
with open(filename, 'r', encoding='utf-8') as f:
    content = f.read()

matches = re.finditer(r'<iframe[^>]*srcdoc="([^"]*)"[^>]*>', content)
for i, m in enumerate(matches):
    srcdoc = html.unescape(m.group(1))
    print(f"Iframe {i} search:")
    idx = srcdoc.find("questions = [")
    if idx == -1:
        idx = srcdoc.find("questions=[")
    if idx != -1:
        print(f"  Found 'questions =' at {idx}")
        print(srcdoc[max(0, idx-20):idx+100])
    else:
        print("  'questions =' not found")
