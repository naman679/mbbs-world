import json
import re
import os

filename = "CEREB_Anatomy.html"
papers_dir = r"c:\Users\91997\Downloads\MbbsWorld\papers"
file_path = os.path.join(papers_dir, filename)

image_updates = {
    "A 48-year-old woman undergoes a CT scan of the abdomen for evaluation of chronic right upper quadran": "https://upload.wikimedia.org/wikipedia/commons/b/be/Anatomy_of_liver_and_gall_bladder.png",
    "A 50-year-old man presents with a sudden onset of ataxia and difficulty coordinating his movements": "https://upload.wikimedia.org/wikipedia/commons/9/97/Gray704.png",
    "A 60-year-old patient presents with chronic hip pain. On X-ray, you observe a bony projection extend": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Coxa-valga-norma-vara-000.svg/1280px-Coxa-valga-norma-vara-000.svg.png",
    "A 55-year-old male patient presents with lower limb swelling, pain, and discomfort. Duplex ultrasono": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Diagram_of_the_human_heart_%28cropped%29.svg/1280px-Diagram_of_the_human_heart_%28cropped%29.svg.png",
    "A 55-year-old man with a 30-year history of smoking presents to your clinic complaining of a persist": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Langerhans_cell_histiocytosis_-_very_high_mag.jpg/1280px-Langerhans_cell_histiocytosis_-_very_high_mag.jpg",
    "An 18-year-old female while driving her Two-Wheeler accidentally collided with a Car from the Opposi": "https://upload.wikimedia.org/wikipedia/commons/c/c4/Leg_compartments.jpg",
    "A 28-year-old girl realized that she felt very exhausted and tired after a short walk. She also expe": "https://upload.wikimedia.org/wikipedia/commons/9/9e/Coarctationlayoutv2-575px.jpg"
}

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

print("Using String Replacement method with HTML Entity support.")

new_content = content
updates_made = 0

for snippet, image_url in image_updates.items():
    # We first need to find the snippet.
    # The snippet in "image_updates" is plain text.
    # The file content might have entities or escaped chars.
    # We'll try to match a substring simplified.
    
    # We can try to regex match the snippet with liberal whitespace/entity matching?
    # Or just search for the snippet literal (since it came from audit report which came from find_question which came from file).
    # But audit report text might have undergone changes.
    # Let's clean the snippet (remove non-alphanumeric) and search fuzzily?
    # Or just try exact match first.
    
    pos = new_content.find(snippet)
    if pos == -1:
        # Try finding the FIRST PART of the snippet (20 chars)
        short_snippet = snippet[:20]
        pos = new_content.find(short_snippet)
        if pos == -1:
             print(f"Snippet NOT FOUND (even short): {snippet[:30]}...")
             continue

    # Found snippet (or start of it).
    # Now look specifically for `question_images` array within range.
    chunk_start = pos
    chunk_end = min(len(new_content), pos + 3000) # Increased range just in case
    chunk = new_content[chunk_start:chunk_end]
    
    # Regex to handle quoted or unquoted or html-entity quoted keys
    # Keys: "question_images", 'question_images', &quot;question_images&quot;
    # Values: [], [ ], [&quot;&quot;] etc.
    # We want ONLY empty arrays: []
    
    # Pattern: (quote)question_images(quote)\s*:\s*\[\s*\]
    # Where quote can be ", ', &quot;
    
    pattern = r'(?:"|&#34;|&quot;|\')question_images(?:"|&#34;|&quot;|\')\s*:\s*\[\s*\]'
    
    img_match = re.search(pattern, chunk)
    
    if img_match:
        print(f"Found empty images for: {snippet[:30]}...")
        
        full_match_str = img_match.group(0)
        
        # Determine the quote style used in the match
        # We can just reuse the matched string up to the colon?
        # Or just replace the whole thing `...: []` with `...: ["URL"]`
        # But we need to use the SAME quote style for the URL string.
        
        # If key used &quot;, we should probably use &quot; for the value string too.
        # If key used ", we use ".
        
        if '&quot;' in full_match_str:
            q = '&quot;'
        elif '"' in full_match_str:
            q = '"'
        elif "'" in full_match_str:
            q = "'"
        else:
            q = '"' # Fallback
            
        replacement_str = full_match_str.replace('[]', f'[{q}{image_url}{q}]')
        
        # Apply replacement
        abs_start = chunk_start + img_match.start()
        abs_end = chunk_start + img_match.end()
        
        # Sanity check
        if new_content[abs_start:abs_end] == full_match_str:
            new_content = new_content[:abs_start] + replacement_str + new_content[abs_end:]
            updates_made += 1
            print(f"Replaced with URL: {image_url[:20]}...")
        else:
            print("Replacement index mismatch!")
    else:
        print(f"Could not find empty question_images for: {snippet[:30]}... (Regex: {pattern})")

if updates_made > 0:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Successfully updated {updated_count} questions in {filename}") # updated_count var name in loop was updates_made
    print(f"Updates made: {updates_made}")
else:
    print("No updates saved.")
