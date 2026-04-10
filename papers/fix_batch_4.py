import json
import re
import os
import html

# Load image map from wiki results
with open("wiki_image_results_4.json", "r") as f:
    wiki_results = json.load(f)

# Keyword mapping for CEREB_BTR.html
image_map = {
    "Venous ulcer": wiki_results.get("Venous ulcer"),
    "Squamous cell": wiki_results.get("SCC"),
    "Syphilis": wiki_results.get("Syphilis"),
    "Basal cell": wiki_results.get("BCC"),
    "Chest X-ray": wiki_results.get("X-ray"),
    "X-ray": wiki_results.get("X-ray"),
    "ECG": wiki_results.get("ECG"),
    "Electrocardiogram": wiki_results.get("ECG"),
    "USG": wiki_results.get("USG"),
    "Sonography": wiki_results.get("USG"),
    "ultrasound": wiki_results.get("USG"),
    "MRI": wiki_results.get("MRI"),
    "CT Scan": wiki_results.get("CT Scan"),
    "CT scan": wiki_results.get("CT Scan"),
    "Histology": wiki_results.get("Histology"),
    "Biopsy": wiki_results.get("Biopsy"),
    "microscope": wiki_results.get("Histology"),
    "Ovarian torsion": wiki_results.get("Ovarian torsion"),
    "Nutmeg liver": wiki_results.get("Nutmeg liver"),
    "Mallory-Weiss": wiki_results.get("Mallory-Weiss"),
    "Keratoconus": wiki_results.get("Keratoconus"),
    "Vogt striae": wiki_results.get("Keratoconus"),
    "Glaucoma": wiki_results.get("Glaucoma"),
    "Vogt triad": wiki_results.get("Glaucoma"),
    "Myopia": wiki_results.get("Myopia"),
    "Foster Fuch": wiki_results.get("Myopia"),
    "Thymoma": wiki_results.get("Thymoma"),
    "Neuroblastoma": wiki_results.get("Neuroblastoma"),
    "Hepatoma": wiki_results.get("Hepatoma"),
    "Sarcoidosis": wiki_results.get("Sarcoidosis"),
    "Tuberculosis": wiki_results.get("Tuberculosis"),
    "Appendicitis": wiki_results.get("Appendicitis"),
    "Cholelithiasis": wiki_results.get("Cholelithiasis"),
    "Gallstones": wiki_results.get("Cholelithiasis"),
    "Polyp": wiki_results.get("Polyp"),
    "Adenocarcinoma": wiki_results.get("Adenocarcinoma"),
    "Flow cytometry": wiki_results.get("Flow cytometry"),
    "Sinus rhythm": wiki_results.get("ECG rhythm"),
    "Ventricular tachycardia": wiki_results.get("ECG tachycardia"),
    "Capnography": wiki_results.get("Capnography")
}

filename = "CEREB_BTR.html"

def sanitize_json(text):
    # Quote keys
    text = re.sub(r'([{,]\s*)(\w+):', r'\1"\2":', text)
    # Remove trailing commas
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

def fix_file(filename):
    if not os.path.exists(filename):
        print(f"File {filename} not found.")
        return
    
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    def replace_iframe(match):
        iframe_tag = match.group(0)
        srcdoc_match = re.search(r'srcdoc="([^"]+)"', iframe_tag)
        if not srcdoc_match:
            return iframe_tag
            
        srcdoc = html.unescape(srcdoc_match.group(1))
        
        # Look for questions array assignment
        q_data_matches = list(re.finditer(r'questions\s*=\s*(?=\[)', srcdoc))
        if not q_data_matches:
            return iframe_tag

        changed_iframe = False
        new_srcdoc = srcdoc
        
        # Process from end to beginning to keep indices valid if we replace
        for qm in reversed(q_data_matches):
            start_index = qm.end()
            q_json_str = extract_array_by_brackets(new_srcdoc, start_index)
            if not q_json_str:
                continue
                
            sanitized = sanitize_json(q_json_str)
            try:
                questions = json.loads(sanitized)
                changed_array = False
                for q in questions:
                    if not q.get('question_images'):
                        q_text = (q.get('text', '') + " " + " ".join([str(o.get('text','')) for o in q.get('options', [])])).lower()
                        # Use keywords to find appropriate image
                        for keyword, url in image_map.items():
                            if url and keyword.lower() in q_text:
                                q['question_images'] = [url]
                                changed_array = True
                                changed_iframe = True
                                # print(f"  Matched '{keyword}'")
                                break
                
                if changed_array:
                    new_q_json = json.dumps(questions, indent=2)
                    new_srcdoc = new_srcdoc[:start_index] + new_q_json + new_srcdoc[start_index + len(q_json_str):]
                    
            except Exception as e:
                pass
        
        if changed_iframe:
            new_srcdoc_escaped = html.escape(new_srcdoc).replace('"', "&quot;")
            return iframe_tag.replace(srcdoc_match.group(1), new_srcdoc_escaped)
        
        return iframe_tag

    new_content = re.sub(r'<iframe[^>]*srcdoc="[^"]*"[^>]*></iframe>', replace_iframe, content, flags=re.DOTALL)
    
    if new_content != content:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filename}")
    else:
        print(f"No changes for {filename}")

if __name__ == "__main__":
    print(f"Processing {filename}...")
    fix_file(filename)
