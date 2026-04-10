import re
import json
import os
import html

def extract_array_by_brackets(content, start_index):
    bracket_count = 0
    in_string = False
    string_char = ''
    escape = False
    
    for i in range(start_index, len(content)):
        char = content[i]
        
        if escape:
            escape = False
            continue
            
        if char == '\\' and in_string:
            escape = True
            continue
            
        if not in_string:
            if char in '"\'':
                in_string = True
                string_char = char
            elif char == '[':
                bracket_count += 1
            elif char == ']':
                bracket_count -= 1
                if bracket_count == 0:
                    return content[start_index:i+1], i+1
        else:
            if char == string_char:
                in_string = False
                
    return None, None

def clean_js_to_json(text):
    text = text.replace(r'\u0026quot;', '"')
    text = text.replace(r'\u0026gt;', '>')
    text = text.replace(r'\u0026lt;', '<')
    text = text.replace(r'\u0026amp;', '&')
    text = text.replace(r'\u0026#x27;', "'")
    text = text.replace(r"\'", "'")
    text = re.sub(r'([{,]\s*)([a-zA-Z0-9_]+)(\s*:)', r'\1"\2"\3', text)
    text = re.sub(r',\s*([\]}])', r'\1', text)
    return text

def aggressive_norm(t):
    # Unescape twice to be sure (handles &amp;quot;)
    t = html.unescape(html.unescape(t))
    return re.sub(r'[^a-z0-9]', '', t.lower())

def fix_grand_tests():
    with open('sourced_grand_tests_v1.json', 'r', encoding='utf-8') as f:
        sourced_data = json.load(f)
        
    file_groups = {}
    for item in sourced_data:
        fname = item['file']
        if fname not in file_groups:
            file_groups[fname] = {}
        idx = item['iframe_index']
        if idx not in file_groups[fname]:
            file_groups[fname][idx] = []
        file_groups[fname][idx].append(item)
        
    for filename, iframe_updates in file_groups.items():
        file_path = os.path.join(r"c:\Users\91997\Downloads\MbbsWorld\papers", filename)
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue
            
        print(f"Processing {filename}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Use regex to split content by iframes. Consistent with extract_grand_tests.py
        pattern = re.compile(r'(<iframe[^>]*srcdoc=(["\']))(.*?)\2', re.S | re.I)
        matches = list(pattern.finditer(content))
        print(f"  Found {len(matches)} iframes with srcdoc")
        
        # 1. Update all questions that match their predicted iframe_index
        # 2. Fallback: Update any remaining questions by searching ALL iframes
        
        remaining_updates = {i: list(updates) for i, updates in iframe_updates.items()}
        
        new_content_raw = []
        last_pos = 0
        
        # We'll first rebuild the iframes by iterating through them
        for idx, match in enumerate(matches):
            new_content_raw.append(content[last_pos:match.start(3)])
            srcdoc_raw = match.group(3)
            srcdoc = html.unescape(srcdoc_raw)
            if '&lt;' in srcdoc and '&gt;' in srcdoc and not '<' in srcdoc:
                srcdoc = html.unescape(srcdoc)
            
            # Find all question blocks in this srcdoc
            q_data_matches = list(re.finditer(r'questions\s*=\s*(?=\[)', srcdoc))
            
            if q_data_matches:
                updated_any = False
                # Work backwards within srcdoc to avoid offset issues
                for q_m in reversed(q_data_matches):
                    start_idx = q_m.end()
                    json_str, end_idx = extract_array_by_brackets(srcdoc, start_idx)
                    
                    if json_str:
                        try:
                            try:
                                questions = json.loads(json_str)
                            except:
                                clean_json = clean_js_to_json(json_str)
                                questions = json.loads(clean_json)
                                
                            updated_count = 0
                            for q in questions:
                                q_norm = aggressive_norm(q.get('text', ''))
                                
                                # Try to find match in ANY of the file's remaining updates
                                matched_update = None
                                for u_idx in list(remaining_updates.keys()):
                                    for su in remaining_updates[u_idx]:
                                        s_norm = aggressive_norm(su['text'])
                                        if q_norm == s_norm:
                                            q['question_images'] = su['sourced_images']
                                            updated_count += 1
                                            matched_update = (u_idx, su)
                                            break
                                    if matched_update: break
                                    
                                if matched_update:
                                    # Optional: Remove from remaining if we want to ensure 1-to-1
                                    # remaining_updates[matched_update[0]].remove(matched_update[1])
                                    pass
                                    
                            if updated_count > 0:
                                print(f"    Iframe {idx}: Updated {updated_count} questions")
                                updated_any = True
                                new_json_str = json.dumps(questions, separators=(',', ':'), ensure_ascii=True)
                                srcdoc = srcdoc[:start_idx] + new_json_str + srcdoc[end_idx:]
                        except:
                            pass
                
                if updated_any:
                    # Re-escape and append
                    updated_srcdoc_escaped = html.escape(srcdoc).replace('"', '&quot;')
                    new_content_raw.append(updated_srcdoc_escaped)
                else:
                    new_content_raw.append(srcdoc_raw)
            else:
                new_content_raw.append(srcdoc_raw)
                
            last_pos = match.end(3)
            
        new_content_raw.append(content[last_pos:])
        final_content = "".join(new_content_raw)
        
        # Backup
        backup_path = file_path + ".bak"
        if not os.path.exists(backup_path):
            os.rename(file_path, backup_path)
            
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(final_content)
        print(f"  Successfully wrote {filename}. Count of Wikipedia URLs: {final_content.count('upload.wikimedia.org')}")

if __name__ == "__main__":
    fix_grand_tests()
