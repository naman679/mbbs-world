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
                    return content[start_index:i+1]
        else:
            if char == string_char:
                in_string = False
                
    return None

def clean_js_to_json(text):
    # Handle over-escaped characters
    text = text.replace(r'\u0026quot;', '"')
    text = text.replace(r'\u0026gt;', '>')
    text = text.replace(r'\u0026lt;', '<')
    text = text.replace(r'\u0026amp;', '&')
    text = text.replace(r'\u0026#x27;', "'")
    text = text.replace(r"\'", "'")
    
    # Simple JS object to JSON: Quote unquoted keys
    text = re.sub(r'([{,]\s*)([a-zA-Z0-9_]+)(\s*:)', r'\1"\2"\3', text)
    
    # Remove trailing commas in arrays/objects
    text = re.sub(r',\s*([\]}])', r'\1', text)
    
    return text

def extract_questions_from_file(file_path):
    print(f"Processing {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all iframes with srcdoc (handle " or ')
    iframe_matches = list(re.finditer(r'<iframe[^>]*srcdoc=(["\'])(.*?)\1', content, re.S | re.I))
    print(f"Found {len(iframe_matches)} iframes.")
    
    all_extracted = []
    
    for idx, match in enumerate(iframe_matches):
        srcdoc_raw = match.group(2)
        srcdoc = html.unescape(srcdoc_raw)
        
        # Look for questions = [
        q_data_matches = list(re.finditer(r'questions\s*=\s*(?=\[)', srcdoc))
        if not q_data_matches:
             # Try with raw srcdoc in case unescape mangled something
             q_data_matches = list(re.finditer(r'questions\s*=\s*(?=\[)', srcdoc_raw))
             if q_data_matches:
                 srcdoc = srcdoc_raw
            
        for q_match in q_data_matches:
            start_index = q_match.end()
            json_str_raw = extract_array_by_brackets(srcdoc, start_index)
            
            if json_str_raw:
                try:
                    # Try direct parse first
                    try:
                        questions = json.loads(json_str_raw)
                    except:
                        # Clean and try again
                        clean_json = clean_js_to_json(json_str_raw)
                        try:
                            questions = json.loads(clean_json)
                        except Exception as e2:
                            print(f"Error parsing JSON in iframe {idx}: {e2}")
                            with open(f"fail_iframe_{idx}.txt", "w", encoding='utf-8') as f_fail:
                                f_fail.write(clean_json)
                            # raise e2  # Continue to other iframes
                        
                    for q in questions:
                        text = q.get('text', '')
                        q_imgs = q.get('question_images', [])
                        e_imgs = q.get('explanation_images', [])
                        
                        # Check if question implies image
                        keywords = ["image below", "figure below", "diagram below", "picture below", "shown below", "identify the", "x-ray", "ct scan", "mri", "histology", "structure pointed"]
                        implies_image = any(kw in text.lower() for kw in keywords)
                        
                        if implies_image and not q_imgs:
                            snippet = text[:200].replace('\n', ' ')
                            all_extracted.append({
                                'file': os.path.basename(file_path),
                                'iframe_index': idx,
                                'text': text,
                                'snippet': snippet,
                                'explanation_images': e_imgs
                            })
                except Exception as e:
                    print(f"Error parsing JSON in iframe {idx}: {e}")
                    
    return all_extracted

def main():
    targets = [
        r"c:\Users\91997\Downloads\MbbsWorld\papers\cereb_g_t.html",
        r"c:\Users\91997\Downloads\MbbsWorld\papers\prep_tests_combined.html",
        r"c:\Users\91997\Downloads\MbbsWorld\papers\CEREB_Grand_Tests.html"
    ]
    
    all_results = []
    for target in targets:
        if os.path.exists(target):
            all_results.extend(extract_questions_from_file(target))
        else:
            print(f"Target not found: {target}")
            
    with open("extracted_grand_tests.json", "w", encoding='utf-8') as f:
        json.dump(all_results, f, indent=2)
        
    print(f"Extracted {len(all_results)} questions needing images.")

if __name__ == "__main__":
    main()
