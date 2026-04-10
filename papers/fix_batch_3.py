import json
import re
import os
import html

# Load image map from wiki results
with open("wiki_image_results_3.json", "r") as f:
    wiki_results = json.load(f)

# Keyword mapping for more robust matching
image_map = {
    "Pompe disease": wiki_results.get("Pompe disease PAS muscle biopsy"),
    "Naclerio": wiki_results.get("Naclerio V sign"),
    "Boerhaave": wiki_results.get("Naclerio V sign"),
    "Griffith point": wiki_results.get("Griffith point anatomy"),
    "Salter-Harris": wiki_results.get("Salter-Harris III"),
    "MUGA scan": wiki_results.get("MUGA scan"),
    "Psittacosis": wiki_results.get("Psittacosis LCL bodies"),
    "Leventhal": wiki_results.get("Psittacosis LCL bodies"),
    "Nortriptyline": wiki_results.get("TCA overdose ECG"),
    "PICC": wiki_results.get("PICC line DVT ultrasound"),
    "Water's view": wiki_results.get("Waters view X-ray"),
    "Caldwell": wiki_results.get("Caldwell view X-ray"),
    "Rhese": wiki_results.get("Rhese view X-ray"),
    "Submentovertical": wiki_results.get("Submentovertical view X-ray"),
    "SMV view": wiki_results.get("Submentovertical view X-ray"),
    "Gallium-67": wiki_results.get("Gallium-67 scan ear"),
    "Technetium-99m": wiki_results.get("Technetium-99m scan bone"),
    "Glomus tympanicum": wiki_results.get("Glomus tympanicum reddish mass"),
    "Subglottic stenosis": wiki_results.get("Subglottic stenosis CT"),
    "Vesico-Vaginal Fistula": wiki_results.get("Vesicovaginal fistula 3 swab test"),
    "Vesicovaginal fistula": wiki_results.get("Vesicovaginal fistula 3 swab test"),
    "3 Swab Test": wiki_results.get("Vesicovaginal fistula 3 swab test"),
    "Unicornuate uterus": wiki_results.get("Unicornuate uterus HSG"),
    "Partograph": wiki_results.get("Partograph"),
    "Endometrial polyp": wiki_results.get("Endometrial polyp USG"),
    "Canon ball": wiki_results.get("Canon ball metastases X-Ray"),
    "Choriocarcinoma": wiki_results.get("Canon ball metastases X-Ray"),
    "Turner syndrome": wiki_results.get("Turner syndrome streak ovaries"),
    "Lucid interval": wiki_results.get("Lucid interval extradural hematoma"),
    "Pisiform": wiki_results.get("Pisiform bone ossification"),
    "Myocardial infarction": wiki_results.get("Myocardial infarction ECG"),
    "MI": wiki_results.get("Myocardial infarction ECG"),
    "Arsenic poisoning": wiki_results.get("Arsenic poisoning raindrop pigmentation"),
    "Raindrop pigmentation": wiki_results.get("Arsenic poisoning raindrop pigmentation"),
    "Barium carbonate": wiki_results.get("Barium carbonate poisoning"),
    "Rodenticide": wiki_results.get("Barium carbonate poisoning"),
    "Flow cytometry": wiki_results.get("Flow cytometry histogram dot plot"),
    "Ishikawa": wiki_results.get("Ishikawa diagram"),
    "Fishbone": wiki_results.get("Ishikawa diagram"),
    "Demographic cycle": wiki_results.get("Demographic cycle")
}

target_files = [
    "CEREB_BTRs.html",
    "CEREB_ENT.html",
    "obg_pqy.html",
    "CEREB_Forensic_Medicine.html",
    "psm_pyq.html",
    "psm_pyq (2).html"
]

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
                        for keyword, url in image_map.items():
                            if url and keyword.lower() in q_text:
                                q['question_images'] = [url]
                                changed_array = True
                                changed_iframe = True
                                print(f"  Matched '{keyword}' in {filename}")
                                break
                
                if changed_array:
                    new_q_json = json.dumps(questions, indent=2)
                    new_srcdoc = new_srcdoc[:start_index] + new_q_json + new_srcdoc[start_index + len(q_json_str):]
                    
            except Exception as e:
                # print(f"  JSON Error in {filename}: {e}")
                pass
        
        if changed_iframe:
            new_srcdoc_escaped = html.escape(new_srcdoc).replace('"', "&quot;")
            # Be careful with the replacement to only replace the srcdoc content
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
    for f in target_files:
        print(f"Processing {f}...")
        fix_file(f)
