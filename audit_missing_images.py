import os
import re
import json

def extract_js_array(content, start_var_name="questions"):
    """
    Manually extracts a JS array/object starting at 'questions = [' 
    by counting brackets to handle nesting correctly.
    """
    # Find the start index
    pattern = r'\b' + re.escape(start_var_name) + r'\s*=\s*\['
    match = re.search(pattern, content)
    
    if not match:
        # print(f"  [DEBUG] Regex failed to find '{start_var_name} = ['")
        return None
    
    start_idx = match.end() - 1 # This should be the index of '['
    
    # Verify it is indeed '['
    if content[start_idx] != '[':
        return None
        
    bracket_count = 0
    in_string = False
    string_char = None
    escape_next = False
    
    for i in range(start_idx, len(content)):
        char = content[i]
        
        if in_string:
            if escape_next:
                escape_next = False
            elif char == '\\':
                escape_next = True
            elif char == string_char:
                in_string = False
        else:
            if char == '"' or char == "'":
                in_string = True
                string_char = char
            elif char == '[':
                bracket_count += 1
            elif char == ']':
                bracket_count -= 1
                if bracket_count == 0:
                    return content[start_idx : i+1]
    
    return None

def audit_missing_images():
    papers_dir = 'papers'
    if not os.path.exists(papers_dir):
        print(f"Error: Directory '{papers_dir}' not found.")
        return

    files = [os.path.join(papers_dir, f) for f in os.listdir(papers_dir) if f.lower().endswith('.html')]
    
    # Keywords that strongly imply an image is present
    keywords = [
        "image below", "figure below", "shown below", 
        "identify the image", "in the given image", 
        "accompanying image", "following diagram", 
        "following figure", "structure marked", "arrow marked",
        "identify the structure", "shown in the photograph",
        "see the image", "refer to the image"
    ]
    
    print(f"Starting audit for missing images in {len(files)} files...\n")
    
    count_missing = 0
    files_with_issues = 0
    
    for file_path in files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        json_str = extract_js_array(content, "questions")
        
        if json_str:
            try:
                # Attempt to parse as JSON. 
                questions = json.loads(json_str)
                
                # print(f"File: {os.path.basename(file_path)} - Parsed {len(questions)} questions")
                
                file_has_issue = False
                for i, q in enumerate(questions):
                    text = q.get('text', '').lower()
                    images = q.get('question_images', [])
                    
                    found_keyword = next((k for k in keywords if k in text), None)
                    if found_keyword and "not shown" not in text:
                         # Strict check: only report if image array is empty
                         if len(images) == 0:
                                if not file_has_issue:
                                    print(f"\nFile: {os.path.basename(file_path)}")
                                    file_has_issue = True
                                    files_with_issues += 1
                                
                                print(f"  *** MISSING IMAGE *** Q{i+1}: Found '{found_keyword}' - \"{q.get('text', '')[:100]}...\"")
                                count_missing += 1
                                
            except json.JSONDecodeError as e:
                print(f"Warning: Could not parse JSON in {os.path.basename(file_path)}. Error: {e}")
        else:
            # Try finding 'let questions = [' or similar if first attempt fails?
            # Or just warn
            print(f"Warning: Could not find 'questions = [' in {os.path.basename(file_path)}")

    print(f"\nAudit complete.")
    print(f"Total potential missing images found: {count_missing}")
    print(f"Files affected: {files_with_issues}")

if __name__ == "__main__":
    audit_missing_images()
