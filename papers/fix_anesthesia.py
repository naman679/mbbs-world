import os

file_path = r"c:\Users\91997\Downloads\MbbsWorld\papers\anesthesia_pyq.html"

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Target unique string sequence from found_context.txt
# We use a large enough unique chunk
target_chunk = '&quot;correct_answer&quot;: &quot;C. 96 ml/min&quot;, &quot;question_images&quot;: [],'
replacement_chunk = '&quot;correct_answer&quot;: &quot;C. 96 ml/min&quot;, &quot;question_images&quot;: [&quot;https://upload.wikimedia.org/wikipedia/commons/e/e5/Peripheral_venous_catheter.jpg&quot;],'

if target_chunk in content:
    print("Found target chunk! Replacing...")
    new_content = content.replace(target_chunk, replacement_chunk)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced.")
else:
    print("Target chunk NOT found in content.")
    # Debug: Print surrounding of "C. 96 ml/min" to see what differs
    part = '&quot;correct_answer&quot;: &quot;C. 96 ml/min&quot;'
    pos = content.find(part)
    if pos != -1:
         print(f"Found partial at {pos}")
         print(f"Context: {content[pos:pos+100]}")
    else:
         print("Partial NOT found either.")
