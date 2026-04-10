import re
import html

filename = "CEREB_BTR.html"
with open(filename, 'r', encoding='utf-8') as f:
    content = f.read()

matches = list(re.finditer(r'<iframe[^>]*srcdoc="([^"]*)"[^>]*>', content))
print(f"Found {len(matches)} iframes in {filename}")

for i, m in enumerate(matches[:2]): # Check first two
    srcdoc = html.unescape(m.group(1))
    print(f"Iframe {i} search:")
    # Check for questions variable
    for var_type in ["let", "var", "const"]:
        idx = srcdoc.find(f"{var_type} questions = [")
        if idx == -1:
            idx = srcdoc.find(f"{var_type} questions=[")
        if idx != -1:
            print(f"  Found '{var_type} questions =' at {idx}")
            print(srcdoc[max(0, idx-20):idx+100])
            break
    else:
        # Check without var keyword
        idx = srcdoc.find("questions = [")
        if idx == -1:
            idx = srcdoc.find("questions=[")
        if idx != -1:
            print(f"  Found 'questions =' at {idx}")
            print(srcdoc[max(0, idx-20):idx+100])
        else:
            print("  'questions =' not found")
