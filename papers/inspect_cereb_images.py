import os
import re
import json

# Target directory
papers_dir = r"c:\Users\91997\Downloads\MbbsWorld\papers"

# papers_dir = r"c:\Users\91997\Downloads\MbbsWorld\papers"
# cereb_files = [f for f in os.listdir(papers_dir) if f.startswith("CEREB_") and f.endswith(".html")]
cereb_files = ["CEREB_Dermatology.html"]

print(f"Found {len(cereb_files)} CEREB files.")

total_potential_fixes = 0

for filename in cereb_files:
    file_path = os.path.join(papers_dir, filename)
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Find the JSON data (variable assignment) -> usually 'var questions = [...]' or inside a script
    # We'll regex for the list of objects: [ ... ] that contains "question_images"
    # Actually, simpler to find objects that have 'question_images": []' and 'explanation_images": ["http..."]'
    
    # We will iterate through the file content to find patterns
    # Pattern: "question_images": [], .... "explanation_images": ["http..."]
    # Be careful with whitespace and order.
    
    # Let's count occurrences where correct_answer is followed by question_images: [] and then explanation_images has something.
    
    # We can use a regex to find the question block structure
    # "options": \[.*?\], "correct_answer": ".*?", "question_images": \[\], "explanation_images": \["(.*?)"\]
    
    # Debug: find where questions start
    start_marker = "var questions = "
    start_pos = content.find(start_marker)
    if start_pos != -1:
        print(f"File: {filename} - Found 'var questions =' at {start_pos}")
        snippet = content[start_pos:start_pos+500]
        print(f"Snippet:\n{snippet}\n---")
        
        # Try a simpler regex to catch just one case and see what it looks like
        # Look for "question_images"
        q_img_pos = snippet.find('"question_images"')
        if q_img_pos != -1:
             print(f"  'question_images' found at relative pos {q_img_pos}")
             print(f"  Surrounding text: {snippet[q_img_pos:q_img_pos+100]}")
    else:
        print(f"File: {filename} - 'var questions =' NOT FOUND")

    # pattern = r'"question_images":\s*\[\],\s*"explanation_images":\s*\["(http[^"]+)"\]'
    # matches = re.findall(pattern, content)
    
    # if matches:
    #    print(f"File: {filename} - Found {len(matches)} potential images in explanation_images")
    #    total_potential_fixes += len(matches)
    #    for i, url in enumerate(matches[:3]):
    #        print(f"  URL: {url}")
