import json
import re
import os
import html
import sys

# Increase recursion depth for deep nesting if any
sys.setrecursionlimit(2000)

target_files = [
    "CEREB_BTRs.html",
    "CEREB_ENT.html",
    "obg_pqy.html",
    "CEREB_Forensic_Medicine.html",
    "psm_pyq.html",
    "psm_pyq (2).html"
]

papers_dir = r"c:\Users\91997\Downloads\MbbsWorld\papers"

def extract_questions_from_file(filename):
    filepath = os.path.join(papers_dir, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return []

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find iframes with srcdoc
    iframe_matches = list(re.finditer(r'srcdoc=["\'](.*?)["\']', content, re.DOTALL))
    
    extracted = []
    for i, m in enumerate(iframe_matches):
        srcdoc_content = m.group(1)
        decoded_content = html.unescape(srcdoc_content)
        
        # Look for questions array assignment
        # Using a stricter regex to find the populated questions array
        q_data_matches = list(re.finditer(r'questions\s*=\s*(\[\s*\{)', decoded_content))
        
        for qm in q_data_matches:
            start_index = qm.start(1)
            
            # Simple bracket counting to extract the JSON array
            bracket_count = 0
            in_string = False
            escape = False
            end_index = -1
            
            for k in range(start_index, len(decoded_content)):
                char = decoded_content[k]
                if escape:
                    escape = False
                    continue
                if char == '\\':
                    escape = True
                    continue
                if char == '"':
                    in_string = not in_string
                
                if not in_string:
                    if char == '[':
                        bracket_count += 1
                    elif char == ']':
                        bracket_count -= 1
                        if bracket_count == 0:
                            end_index = k + 1
                            break
            
            if end_index != -1:
                json_str = decoded_content[start_index:end_index]
                
                # Sanitize if it's not perfect JSON (e.g., unquoted keys)
                def sanitize_keys(s):
                    # Quote unquoted keys: { key: ... } -> { "key": ... }
                    s = re.sub(r'(?<=\{)\s*([a-zA-Z0-9_]+)\s*:', r'"\1":', s)
                    s = re.sub(r',\s*([a-zA-Z0-9_]+)\s*:', r',"\1":', s)
                    return s
                
                try:
                    questions = json.loads(json_str)
                except:
                    try:
                        sanitized = sanitize_keys(json_str)
                        questions = json.loads(sanitized)
                    except:
                        continue
                
                # Filter for questions that likely need images based on audit logic
                keywords = ["image", "figure", "shown below", "diagram", "photograph", "x-ray", "scan", "ecg", "picture", "graph"]
                
                for q in questions:
                    q_text = q.get('text', '')
                    options_text = " ".join([str(o.get('text', '')) for o in q.get('options', [])])
                    full_text = (q_text + " " + options_text).lower()
                    
                    needs_image = any(k in full_text for k in keywords)
                    has_images = bool(q.get('question_images'))
                    
                    if needs_image and not has_images:
                        extracted.append({
                            "file": filename,
                            "iframe_index": i,
                            "text": q_text,
                            "options": q.get('options', [])
                        })
    return extracted

if __name__ == "__main__":
    all_extracted = []
    for f in target_files:
        print(f"Extracting questions from {f}...")
        results = extract_questions_from_file(f)
        all_extracted.extend(results)
    
    output_file = "batch_3_questions.json"
    with open(output_file, 'w', encoding='utf-8') as out:
        json.dump(all_extracted, out, indent=2)
    
    print(f"Extracted {len(all_extracted)} questions to {output_file}")
