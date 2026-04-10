import re
import json
import html

filename = "CEREB_BTR.html"
output_file = "questions_batch_4.json"

with open(filename, 'r', encoding='utf-8') as f:
    content = f.read()

# Keywords that imply an image should be present
keywords = ["image below", "figure below", "shown below", "identify", "x-ray", "ecg", "usg", "ct scan", "mri", "histology", "biopsy", "graph", "diagram"]

extracted_questions = []

def sanitize_json(text):
    text = re.sub(r'([{,]\s*)(\w+):', r'\1"\2":', text)
    text = re.sub(r',\s*([\]}])', r'\1', text)
    return text

def extract_array_by_brackets(content, start_index):
    bracket_count = 0
    in_string = False
    string_char = ''
    for i in range(start_index, len(content)):
        char = content[i]
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
            if char == string_char and content[i-1] != '\\':
                in_string = False
    return None

iframes = re.finditer(r'<iframe[^>]*srcdoc="([^"]*)"[^>]*>', content)
for i, iframe_match in enumerate(iframes):
    srcdoc = html.unescape(iframe_match.group(1))
    q_matches = list(re.finditer(r'questions\s*=\s*(?=\[)', srcdoc))
    for qm in q_matches:
        start_index = qm.end()
        q_json_str = extract_array_by_brackets(srcdoc, start_index)
        if q_json_str:
            sanitized = sanitize_json(q_json_str)
            try:
                questions = json.loads(sanitized)
                for q in questions:
                    q_text = (q.get('text', '') + " " + " ".join([o.get('text', '') for o in q.get('options', [])])).lower()
                    if not q.get('question_images') and any(kw in q_text for kw in keywords):
                        extracted_questions.append({
                            "id": q.get('id'),
                            "text": q.get('text'),
                            "options": [o.get('text') for o in q.get('options', [])],
                            "iframe_index": i
                        })
            except:
                pass

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(extracted_questions, f, indent=2)

print(f"Extracted {len(extracted_questions)} questions to {output_file}")
