import json
import re
import os
import html
import sys

# Increase recursion depth just in case
sys.setrecursionlimit(2000)

files = {
    "CEREB_Anesthesia.html": [
        "A 75-year-old man is brought to the casualty unconscious and with unrecordable BP",
        "A 10-year-old boy is being induced for exploratory laparotomy",
        "A 40-year-old man is posted for exploratory laparotomy",
        "A 36-year-old female presented to emergency with cough",
        "A 70-year-old male with h/o atherosclerosis",
        "A 55-year-old man presents to the emergency room with severe chest pain",
        "A young schizophrenic female presents with abdominal pain",
        "Which of the following is a true statement(s) about capsule endoscopy",
        "Which one of these statements is not true regarding capnography",
        "Which of these ECG changes are seen in Local Anesthesia Systemic Toxicity"
    ],
    "CEREB_Biochemistry.html": [
        "An 18-year-old male is brought to the emergency department with acute left flank pain",
        "A 40-year-old woman with a family history of ischemic heart disease",
        "A 35-year-old man with abetalipoproteinemia",
        "A 70-year-old male with h/o atherosclerosis",
        "A 55-year-old man presents to the emergency room with severe chest pain",
        "A young schizophrenic female presents with abdominal pain",
        "Which of the following is a true statement(s) about capsule endoscopy",
        "A 12-year-old boy presents to the pediatric clinic with a notably disfigured face"
    ]
}

papers_dir = r"c:\Users\91997\Downloads\MbbsWorld\papers"
extracted_data = []

def extract_json_array(content, start_index):
    """
    Extracts a JSON array starting at start_index in content.
    Returns (parsed_json, end_index) or (None, -1).
    """
    bracket_count = 0
    in_string = False
    string_char = None
    escape = False
    
    for i in range(start_index, len(content)):
        char = content[i]
        
        if escape:
            escape = False
            continue
        
        if char == '\\':
            escape = True
            continue
        
        if not in_string:
            if char == '"' or char == "'":
                in_string = True
                string_char = char
            elif char == '[':
                bracket_count += 1
            elif char == ']':
                bracket_count -= 1
                if bracket_count == 0:
                    json_str = content[start_index:i+1]
                    try:
                        return json.loads(json_str), i+1
                    except json.JSONDecodeError as e:
                        print(f"JSON Decode Error: {e}")
                        # print(f"Snippet: {json_str[:100]}...")
                        return None, -1
        else:
            if char == string_char:
                in_string = False
                string_char = None
                
    return None, -1

for filename, snippets in files.items():
    file_path = os.path.join(papers_dir, filename)
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue

    print(f"Processing {filename}...")
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        raw_content = f.read()

    found_in_file = False
    
    # Debug: count raw "srcdoc" occurrences
    raw_srcdoc_count = raw_content.count('srcdoc=')
    print(f"  Raw srcdoc count: {raw_srcdoc_count}")

    iframe_matches = list(re.finditer(r'srcdoc=["\'](.*?)["\']', raw_content, re.DOTALL))
    print(f"  Regex srcdoc matches: {len(iframe_matches)}")
    
    for i, iframe_match in enumerate(iframe_matches):
        srcdoc_content = iframe_match.group(1)
        decoded_content = html.unescape(srcdoc_content)
        
        # Debug: check for "questions =" in decoded content
        q_count_raw = decoded_content.count('questions =')
        # print(f"    Iframe {i}: 'questions =' count: {q_count_raw}")
        
        question_matches = list(re.finditer(r'questions\s*=\s*(\[\s*\{)', decoded_content))
        # print(f"    Iframe {i}: regex 'questions = [{{' matches: {len(question_matches)}")

        for q_match in question_matches:
            start_index = q_match.start(1)
            
            questions_data, end_index = extract_json_array(decoded_content, start_index)
            
            if questions_data:
                # print(f"      Parsed {len(questions_data)} questions.")
                for snippet in snippets:
                    for q in questions_data:
                        q_text = q.get('text', '')
                        # Simple substring match
                        if snippet in q_text:
                            print(f"        MATCH FOUND: {snippet[:40]}...")
                            extracted_data.append({
                                "file": filename,
                                "iframe_index": i,
                                "snippet": snippet,
                                "full_text": q_text,
                                "options": q.get('options', []),
                                "explanation_images": q.get('explanation_images', []),
                                "question_images": q.get('question_images', [])
                            })
                            found_in_file = True

    if not found_in_file:
         print(f"  Warning: No snippets matched in {filename}")

with open("batch_1_questions.json", "w", encoding="utf-8") as f:
    json.dump(extracted_data, f, indent=2)

print(f"Extraction complete. Found {len(extracted_data)} total matches.")
