import json
import re
import os
import html

# Mappings of Snippet Keywords -> Image URL
image_map = {
    "unrecordable BP": "https://upload.wikimedia.org/wikipedia/commons/6/6e/Defibrillation_Electrode_Position.jpg",
    "CPR": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/CPR_training-04.jpg/1280px-CPR_training-04.jpg",
    "endotracheal tube": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Glidescope_02.JPG/1280px-Glidescope_02.JPG",
    "Propofol Infusion Syndrome": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Propofol.svg/1280px-Propofol.svg.png",
    "Aortic Dissection": "https://upload.wikimedia.org/wikipedia/commons/d/d4/AoDissekt_scheme_StanfordB_en.png",
    "Esophageal Perforation": "https://upload.wikimedia.org/wikipedia/commons/7/7a/Boorhaave1.JPG",
    "Trichobezoar": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Common_house_cat_coughing_hairball.ogv/1280px--Common_house_cat_coughing_hairball.ogv.jpg",
    "Capsule endoscopy": "https://upload.wikimedia.org/wikipedia/commons/f/f9/CapsuleEndoscope.jpg",
    "Capnography": "https://upload.wikimedia.org/wikipedia/commons/5/5e/Capnogram.png",
    "Local Anesthesia Systemic Toxicity": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Local_anesthetics_general_structure.svg/1280px-Local_anesthetics_general_structure.svg.png",
    # Biochemistry specific
    "Cystinuria": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Cystine_Crystals_in_Canine_Urine_Sediment.jpg/1280px-Cystine_Crystals_in_Canine_Urine_Sediment.jpg",
    "hexagonal transparent crystals": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Cystine_Crystals_in_Canine_Urine_Sediment.jpg/1280px-Cystine_Crystals_in_Canine_Urine_Sediment.jpg",
    "Aspirin": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Aspirin-skeletal.svg/1280px-Aspirin-skeletal.svg.png",
    "ischemic heart disease": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Aspirin-skeletal.svg/1280px-Aspirin-skeletal.svg.png", 
    "Abetalipoproteinemia": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Abetalipoproteinemia_-_very_high_mag.jpg/960px-Abetalipoproteinemia_-_very_high_mag.jpg",
    "Porphyria": "https://upload.wikimedia.org/wikipedia/commons/0/06/Congenital-erythropoietic-porphyria-1.jpg",
    "disfigured face": "https://upload.wikimedia.org/wikipedia/commons/0/06/Congenital-erythropoietic-porphyria-1.jpg"
}

target_files = ["CEREB_Anesthesia.html", "CEREB_Biochemistry.html"]
papers_dir = r"c:\Users\91997\Downloads\MbbsWorld\papers"

with open("batch_fix_log.txt", "w", encoding="utf-8") as log_file:
    def log(msg):
        # Also print to stdout for interactive use
        print(msg)
        log_file.write(msg + "\n")

    for filename in target_files:
        filepath = os.path.join(papers_dir, filename)
        if not os.path.exists(filepath):
            log(f"File not found: {filepath}")
            continue
        
        log(f"Processing {filename}...")
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        matches = list(re.finditer(r'srcdoc=["\'](.*?)["\']', content, re.DOTALL))
        log(f"  Found {len(matches)} iframes")

        replacements = [] 
        
        for i, m in enumerate(matches):
            srcdoc_start = m.start(1)
            srcdoc_end = m.end(1)
            srcdoc_content = m.group(1)
            
            decoded_content = html.unescape(srcdoc_content)
            q_matches = list(re.finditer(r'questions\s*=\s*(\[\s*\{)', decoded_content))
            
            if not q_matches:
                continue
                
            iframe_changed = False
            new_decoded_content = decoded_content
            
            for qm in reversed(q_matches):
                q_start = qm.start(1)
                
                # Simple bracket counting for JSON extraction
                bracket_count = 0
                in_string = False
                escape = False
                q_end = -1
                
                for k in range(q_start, len(decoded_content)):
                    char = decoded_content[k]
                    if escape: escape = False; continue
                    if char == '\\': escape = True; continue
                    if char == '"': in_string = not in_string
                    if not in_string:
                        if char == '[': bracket_count += 1
                        elif char == ']':
                            bracket_count -= 1
                            if bracket_count == 0:
                                q_end = k + 1
                                break
                
                if q_end == -1: 
                    log(f"    Iframe {i}: Malformed JSON block")
                    continue 
                
                json_str = decoded_content[q_start:q_end]
                
                # Sanitize JSON helpers
                def sanitize_json(s):
                    # Quote unquoted keys: { key: ... } -> { "key": ... }
                    s = re.sub(r'(?<=\{)\s*([a-zA-Z0-9_]+)\s*:', r'"\1":', s)
                    s = re.sub(r',\s*([a-zA-Z0-9_]+)\s*:', r',"\1":', s)
                    return s

                questions = None
                try:
                    questions = json.loads(json_str)
                except Exception as e:
                    try:
                        sanitized = sanitize_json(json_str)
                        questions = json.loads(sanitized)
                        log(f"    Iframe {i}: Recovered JSON with sanitization")
                    except Exception as e2:
                        log(f"    Iframe {i}: JSON parse error (persistent): {e2}")
                        continue
                
                block_changed = False
                if questions:
                    for q in questions:
                        q_text = q.get('text', '')
                        # Collect text from options too
                        options_text = " ".join([str(o.get('text', '')) for o in q.get('options', [])])
                        full_search_text = (q_text + " " + options_text).lower()
                        
                        current_imgs = q.get('question_images', [])
                        
                        for keyword, img_url in image_map.items():
                            if keyword.lower() in full_search_text:
                                log(f"      Keyword match: '{keyword}' in Question (or options)")
                                if img_url not in current_imgs:
                                    log(f"      Injecting image: {img_url[:30]}...")
                                    if isinstance(current_imgs, list):
                                        q['question_images'] = [img_url]
                                    else:
                                        q['question_images'] = [img_url]
                                    block_changed = True
                                    break
                                else:
                                    log(f"      Skipping: Already has THIS image.")
                
                if block_changed:
                    iframe_changed = True
                    new_json = json.dumps(questions)
                    new_decoded_content = new_decoded_content[:q_start] + new_json + new_decoded_content[q_end:]
            
            if iframe_changed:
                new_srcdoc = html.escape(new_decoded_content, quote=True)
                replacements.append((srcdoc_start, srcdoc_end, new_srcdoc))

        if replacements:
            log(f"  Updating {len(replacements)} iframes in {filename}")
            replacements.sort(key=lambda x: x[0], reverse=True)
            
            new_file_content = content
            for start, end, new_text in replacements:
                new_file_content = new_file_content[:start] + new_text + new_file_content[end:]
                
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_file_content)
        else:
            log(f"  No changes for {filename}")

    log("Batch fix complete.")
