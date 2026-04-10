import os

file_path = r"c:\Users\91997\Downloads\MbbsWorld\papers\anesthesia_pyq.html"

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

part = '&quot;correct_answer&quot;: &quot;C. 96 ml/min&quot;'
pos = content.find(part)

if pos != -1:
    print(f"Found partial at {pos}")
    snippet = content[pos:pos+150]
    print(f"Snippet repr: {repr(snippet)}")
else:
    print("Partial not found.")
