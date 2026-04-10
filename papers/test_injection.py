import re
import html
import os

file_path = r"c:\Users\91997\Downloads\MbbsWorld\papers\cereb_g_t.html"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Try to find exactly one occurrence of a question we know is there
q_text = "A 32-year-old woman presents to the emergency department after falling onto her outstretched hand."
# This was Iframe 6 in previous logs

if q_text in content:
    print("Found question text in raw content (unescaped) - Wait, this shouldn't happen if it's in srcdoc!")
else:
    print("Question text not in raw content (as expected for srcdoc)")

# Find iframes
matches = list(re.finditer(r'(<iframe[^>]*srcdoc=")([^"]*)(")', content, re.S))
print(f"Found {len(matches)} iframes")

updated = False
for idx, m in enumerate(matches):
    srcdoc = html.unescape(m.group(2))
    if q_text in srcdoc:
        print(f"Found question in iframe {idx}")
        # Inject a dummy URL
        test_url = "https://upload.wikimedia.org/wikipedia/commons/test_injection.jpg"
        # Since it's JSON inside srcdoc, we need to find "question_images":[]
        if '"question_images":[]' in srcdoc:
            new_srcdoc = srcdoc.replace('"question_images":[]', f'"question_images":["{test_url}"]')
            new_srcdoc_escaped = html.escape(new_srcdoc).replace('"', '&quot;')
            content = content[:m.start(2)] + new_srcdoc_escaped + content[m.end(2):]
            updated = True
            print(f"Injected test URL into iframe {idx}")
            break
        elif 'question_images: []' in srcdoc: # JS object style
            new_srcdoc = srcdoc.replace('question_images: []', f'question_images: ["{test_url}"]')
            new_srcdoc_escaped = html.escape(new_srcdoc).replace('"', '&quot;')
            content = content[:m.start(2)] + new_srcdoc_escaped + content[m.end(2):]
            updated = True
            print(f"Injected test URL (JS style) into iframe {idx}")
            break

if updated:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Wrote updated file.")
    # Verify immediately
    with open(file_path, 'r', encoding='utf-8') as f:
        check = f.read()
        print(f"Verification count: {check.count('test_injection.jpg')}")
else:
    print("Could not find question or placeholder in any iframe.")
