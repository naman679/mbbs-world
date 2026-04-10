import os

file_path = r"c:\Users\91997\Downloads\MbbsWorld\papers\biochem_pyq.html"

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Fix 1: HbA1c
target_1 = 'Most preferred chromatography for HbA1c&quot;, &quot;options&quot;: [{&quot;label&quot;: &quot;A&quot;, &quot;text&quot;: &quot;Electrophoresis&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;B&quot;, &quot;text&quot;: &quot;Ion exchange chromatography&quot;, &quot;correct&quot;: true}, {&quot;label&quot;: &quot;C&quot;, &quot;text&quot;: &quot;Affinity chromatography&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;D&quot;, &quot;text&quot;: &quot;Immuno turbidimetry&quot;, &quot;correct&quot;: false}], &quot;correct_answer&quot;: &quot;B. Ion exchange chromatography&quot;, &quot;question_images&quot;: [],'
replacement_1 = 'Most preferred chromatography for HbA1c&quot;, &quot;options&quot;: [{&quot;label&quot;: &quot;A&quot;, &quot;text&quot;: &quot;Electrophoresis&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;B&quot;, &quot;text&quot;: &quot;Ion exchange chromatography&quot;, &quot;correct&quot;: true}, {&quot;label&quot;: &quot;C&quot;, &quot;text&quot;: &quot;Affinity chromatography&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;D&quot;, &quot;text&quot;: &quot;Immuno turbidimetry&quot;, &quot;correct&quot;: false}], &quot;correct_answer&quot;: &quot;B. Ion exchange chromatography&quot;, &quot;question_images&quot;: [&quot;https://upload.wikimedia.org/wikipedia/commons/3/39/HPLC.jpg&quot;],'

# Fix 2: Biotin
target_2 = 'Baby with h/o raw egg ingestion. (picture of baby&#x27;s scalp hairloss) deficiency of which vitamin?&quot;, &quot;options&quot;: [{&quot;label&quot;: &quot;A&quot;, &quot;text&quot;: &quot;Biotin&quot;, &quot;correct&quot;: true}, {&quot;label&quot;: &quot;B&quot;, &quot;text&quot;: &quot;Thiamine&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;C&quot;, &quot;text&quot;: &quot;Riboflavin&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;D&quot;, &quot;text&quot;: &quot;Pyridoxine&quot;, &quot;correct&quot;: false}], &quot;correct_answer&quot;: &quot;A. Biotin&quot;, &quot;question_images&quot;: [],'
replacement_2 = 'Baby with h/o raw egg ingestion. (picture of baby&#x27;s scalp hairloss) deficiency of which vitamin?&quot;, &quot;options&quot;: [{&quot;label&quot;: &quot;A&quot;, &quot;text&quot;: &quot;Biotin&quot;, &quot;correct&quot;: true}, {&quot;label&quot;: &quot;B&quot;, &quot;text&quot;: &quot;Thiamine&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;C&quot;, &quot;text&quot;: &quot;Riboflavin&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;D&quot;, &quot;text&quot;: &quot;Pyridoxine&quot;, &quot;correct&quot;: false}], &quot;correct_answer&quot;: &quot;A. Biotin&quot;, &quot;question_images&quot;: [&quot;https://upload.wikimedia.org/wikipedia/commons/3/36/Alopecia_areata.jpg&quot;],'

new_content = content

if target_1 in new_content:
    print("Found Target 1 (HbA1c). Replacing...")
    new_content = new_content.replace(target_1, replacement_1)
else:
    print("Target 1 NOT found.")

if target_2 in new_content:
    print("Found Target 2 (Biotin). Replacing...")
    new_content = new_content.replace(target_2, replacement_2)
else:
    print("Target 2 NOT found.")

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated biochem_pyq.html")
else:
    print("No changes made.")
