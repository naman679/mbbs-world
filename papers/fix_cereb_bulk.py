import os
import re
import json
import html

# Configuration
directory = r"c:\Users\91997\Downloads\MbbsWorld\papers"
target_files = [f for f in os.listdir(directory) if f.startswith("CEREB_") and f.endswith(".html")]

def fix_file(filepath):
    print(f"Processing {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find ALL matches of 'questions = [{'
    matches = list(re.finditer(r'questions\s*=\s*(\[\s*\{)', content))
    
    if not matches:
        print(f"  No 'questions = [{{' found in {filepath}")
        return False

    print(f"  Found {len(matches)} matches.")
    
    # Process in reverse order to keep indices valid
    modifications = 0
    new_content = content
    
    for m in reversed(matches):
        start_index = m.start(1) # Start of '['
        
        # Simple bracket counting to find the end
        balance = 0
        end_index = -1
        in_string = False
        escape = False
        
        # We start strictly at the '['
        # Note: We need to scan new_content if we were modifying it forward, 
        # but since we reverse, we can scan 'content' but we must apply to 'new_content'.
        # Actually, simpler: define extract bounds on 'content', apply change to 'new_content' 
        # BUT 'new_content' changes size.
        # So we must use 'content' string slicing logic carefully.
        # Better: Accumulate parts? 
        # Or: content is immutable. We just string slice content pieces.
        
        # Scan 'content' for the end of THIS match
        for i in range(start_index, len(content)):
            char = content[i]
            
            if escape:
                escape = False
                continue
            
            if char == '\\':
                escape = True
                continue
            
            if char == '"':
                in_string = not in_string
                continue
                
            if not in_string:
                if char == '[':
                    balance += 1
                elif char == ']':
                    balance -= 1
                    if balance == 0:
                        end_index = i + 1 # Include the ']'
                        break
        
        if end_index == -1:
            print(f"  Could not parse JSON array boundaries at {start_index}")
            continue

        json_str = content[start_index:end_index]
        is_html_encoded = "&quot;" in json_str
        
        decoded_json_str = html.unescape(json_str) if is_html_encoded else json_str
            
        try:
            questions = json.loads(decoded_json_str)
        except json.JSONDecodeError as e:
            print(f"  JSON Decode Error at {start_index}: {e}")
            continue

        changes_in_block = 0
        for q in questions:
            q_imgs = q.get('question_images', [])
            e_imgs = q.get('explanation_images', [])
            
            if not q_imgs and e_imgs:
                q['question_images'] = e_imgs
                changes_in_block += 1
                
        if changes_in_block > 0:
            print(f"  Match at {start_index}: Fixed {changes_in_block} questions.")
            
            new_json_str = json.dumps(questions)
            if is_html_encoded:
                # Re-encode. json.dumps escapes " as \" if inside string? No, json.dumps creates "key": "value".
                # HTML escape: " -> &quot;
                # We need to be careful. html.escape escapes & < > " '
                # json_str was likely just escaping quotes.
                # Let's use html.escape(new_json_str, quote=True)
                new_json_str = html.escape(new_json_str, quote=True)
            
            # Apply to new_content?
            # Slicing is tricky if we do multiple replacements.
            # Since we reversed, start_index and end_index are valid for 'content'.
            # We can construct: left + new + right.
            # But 'right' might have been modified by previous iterations (which were later in file).
            # Wait, if we iterate reversed (last match first).
            # 1. Modify last match. new_content = ...
            # 2. Modify second-to-last match. It is at earlier index.
            # Its relative 'right' part now contains the Modified Last Match?
            # No. content[end_index:] refers to ORIGINAL content.
            # So we cannot easily chain this with 'content'.
            # We must update 'content' (variable) in each step?
            # But finding end_index relies on indices.
            
            # Correct approach with reverse iteration:
            # We calculate all bounds (start, end) based on ORIGINAL content.
            # Store them in a list: (start, end, new_text).
            # Then apply from last to first.
            
            # I can't calculate bounds in one pass easily inside the loop if I modify.
            # So: 
            # 1. Calculate bounds for THIS match.
            # 2. Generate Replacement.
            # 3. Apply to 'new_content'.
            # BUT 'new_content' indices shift.
            # IF I use a list of replacements (start, end, replacement) and apply all at once?
            pass # See below
            
    # Calculate replacements
    replacements = [] # (start, end, replacement_text)
    
    for m in matches:
        start_index = m.start(1)
        # Find end
        balance = 0
        end_index = -1
        in_string = False
        escape = False
        for i in range(start_index, len(content)):
            char = content[i]
            if escape: escape = False; continue
            if char == '\\': escape = True; continue
            if char == '"': in_string = not in_string; continue
            if not in_string:
                if char == '[': balance += 1
                elif char == ']':
                    balance -= 1
                    if balance == 0:
                        end_index = i + 1
                        break
        
        if end_index == -1: continue # Skip malformed
        
        json_str = content[start_index:end_index]
        is_html_encoded = "&quot;" in json_str
        decoded_json_str = html.unescape(json_str) if is_html_encoded else json_str
        
        try:
            questions = json.loads(decoded_json_str)
        except: continue
        
        changes = 0
        for q in questions:
            if not q.get('question_images') and q.get('explanation_images'):
                q['question_images'] = q['explanation_images']
                changes += 1
        
        if changes > 0:
            print(f"  match at {start_index}: {changes} fixes.")
            res = json.dumps(questions)
            if is_html_encoded:
                res = html.escape(res, quote=True)
            replacements.append((start_index, end_index, res))
            modifications += changes

    # Apply replacements in reverse order
    if replacements:
        replacements.sort(key=lambda x: x[0], reverse=True)
        temp_content = content
        for start, end, text in replacements:
            temp_content = temp_content[:start] + text + temp_content[end:]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(temp_content)
        return True
    
    return False

# Run
count = 0
for filename in target_files:
    if fix_file(os.path.join(directory, filename)):
        count += 1

print(f"Total files updated: {count}")
