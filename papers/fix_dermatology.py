import os

file_path = r"c:\Users\91997\Downloads\MbbsWorld\papers\CEREB_Dermatology.html"

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Fix 1: Pemphigus Foliaceus
# Note: Using &quot; strictly as it appears in the file
target_1 = 'A 45-year-old male presents to the dermatology clinic with a sudden appearance of skin lesions on the entire upper half of the body for the past 7 days. On examination, you notice erythematous shallow erosions with blisters and yellowish scales over seborrheic areas, as shown in the image below. The oral mucosa is normal. Histology revealed a subcorneal cleft, and DIF shows IgG deposition in the granular layer of the epidermis and autoantibodies against Desmoglein 1. What is the most likely diagnosis?&quot;, &quot;options&quot;: [{&quot;label&quot;: &quot;A&quot;, &quot;text&quot;: &quot;Bullous Pemphigoid&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;B&quot;, &quot;text&quot;: &quot;Pemphigus Vulgaris&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;C&quot;, &quot;text&quot;: &quot;Pemphigus Foliaceus&quot;, &quot;correct&quot;: true}, {&quot;label&quot;: &quot;D&quot;, &quot;text&quot;: &quot;Dermatitis Herpetiformis&quot;, &quot;correct&quot;: false}], &quot;correct_answer&quot;: &quot;C. Pemphigus Foliaceus&quot;, &quot;question_images&quot;: [],'
replacement_1 = 'A 45-year-old male presents to the dermatology clinic with a sudden appearance of skin lesions on the entire upper half of the body for the past 7 days. On examination, you notice erythematous shallow erosions with blisters and yellowish scales over seborrheic areas, as shown in the image below. The oral mucosa is normal. Histology revealed a subcorneal cleft, and DIF shows IgG deposition in the granular layer of the epidermis and autoantibodies against Desmoglein 1. What is the most likely diagnosis?&quot;, &quot;options&quot;: [{&quot;label&quot;: &quot;A&quot;, &quot;text&quot;: &quot;Bullous Pemphigoid&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;B&quot;, &quot;text&quot;: &quot;Pemphigus Vulgaris&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;C&quot;, &quot;text&quot;: &quot;Pemphigus Foliaceus&quot;, &quot;correct&quot;: true}, {&quot;label&quot;: &quot;D&quot;, &quot;text&quot;: &quot;Dermatitis Herpetiformis&quot;, &quot;correct&quot;: false}], &quot;correct_answer&quot;: &quot;C. Pemphigus Foliaceus&quot;, &quot;question_images&quot;: [&quot;https://upload.wikimedia.org/wikipedia/commons/e/e0/Plate_XVIII%2C_Pemphigus_foliaceus%2C_Crocker_1896_Wellcome_L0074328.jpg&quot;],'

# Fix 2: Urethritis (NGU/Chlamydia)
target_2 = 'Three weeks after an unprotected sexual encounter, a 46-year-old man experiences scanty mucoid discharge from his urethra. Which of the following diagnostic tests is advised?&quot;, &quot;options&quot;: [{&quot;label&quot;: &quot;A&quot;, &quot;text&quot;: &quot;Culture and sensitivity&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;B&quot;, &quot;text&quot;: &quot;Nucleic Acid Amplification Test&quot;, &quot;correct&quot;: true}, {&quot;label&quot;: &quot;C&quot;, &quot;text&quot;: &quot;Enzyme Linked Immunosorbent Assay&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;D&quot;, &quot;text&quot;: &quot;Microscopy showing inclusion bodies.&quot;, &quot;correct&quot;: false}], &quot;correct_answer&quot;: &quot;B. Nucleic Acid Amplification Test&quot;, &quot;question_images&quot;: [],'
replacement_2 = 'Three weeks after an unprotected sexual encounter, a 46-year-old man experiences scanty mucoid discharge from his urethra. Which of the following diagnostic tests is advised?&quot;, &quot;options&quot;: [{&quot;label&quot;: &quot;A&quot;, &quot;text&quot;: &quot;Culture and sensitivity&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;B&quot;, &quot;text&quot;: &quot;Nucleic Acid Amplification Test&quot;, &quot;correct&quot;: true}, {&quot;label&quot;: &quot;C&quot;, &quot;text&quot;: &quot;Enzyme Linked Immunosorbent Assay&quot;, &quot;correct&quot;: false}, {&quot;label&quot;: &quot;D&quot;, &quot;text&quot;: &quot;Microscopy showing inclusion bodies.&quot;, &quot;correct&quot;: false}], &quot;correct_answer&quot;: &quot;B. Nucleic Acid Amplification Test&quot;, &quot;question_images&quot;: [&quot;https://upload.wikimedia.org/wikipedia/commons/f/fe/SOA-non_specific_Urethritis-male.jpg&quot;],'

new_content = content

if target_1 in new_content:
    print("Found Target 1 (Pemphigus). Replacing...")
    new_content = new_content.replace(target_1, replacement_1)
else:
    print("Target 1 NOT found.")
    # Debug: print search snippet
    print(f"Snippet start: {target_1[:50]}...")

if target_2 in new_content:
    print("Found Target 2 (Urethritis/NGU). Replacing...")
    new_content = new_content.replace(target_2, replacement_2)
else:
    print("Target 2 NOT found.")

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated CEREB_Dermatology.html")
else:
    print("No changes made.")
