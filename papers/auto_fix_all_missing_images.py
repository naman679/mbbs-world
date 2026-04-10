import re
import json
import os
import html
import urllib.request
import urllib.parse
import time

PAPERS_DIR = r"c:\Users\91997\Downloads\MbbsWorld\papers"
CACHE_FILE = r"c:\Users\91997\Downloads\MbbsWorld\papers\auto_sourced_images_cache.json"

# --- HELPER FUNCTIONS ---

def get_wikipedia_images(query):
    try:
        search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&format=json"
        headers = {'User-Agent': 'MedicalAuditBot/1.0 (contact: user@example.com)'}
        req = urllib.request.Request(search_url, headers=headers)
        
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
        if not data.get('query', {}).get('search'): return []
        page_title = data['query']['search'][0]['title']
        
        img_query_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(page_title)}&prop=images&format=json"
        req = urllib.request.Request(img_query_url, headers=headers)
        
        with urllib.request.urlopen(req) as response:
            img_data = json.loads(response.read().decode())
            
        pages = img_data.get('query', {}).get('pages', {})
        page_id = list(pages.keys())[0]
        images = pages[page_id].get('images', [])
        
        image_titles = [img['title'] for img in images if any(img['title'].lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.svg'])]
        image_titles = [t for t in image_titles if not any(x in t.lower() for x in ['icon', 'logo', 'edit-clear', 'magnifying_glass', 'ambox', 'commons-logo', 'symbol'])]
        
        if not image_titles: return []
            
        urls = []
        for title in image_titles[:3]:
            info_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(title)}&prop=imageinfo&iiprop=url&format=json"
            req = urllib.request.Request(info_url, headers=headers)
            with urllib.request.urlopen(req) as response:
                info_data = json.loads(response.read().decode())
                info_pages = info_data.get('query', {}).get('pages', {})
                info_id = list(info_pages.keys())[0]
                if 'imageinfo' in info_pages[info_id]:
                    urls.append(info_pages[info_id]['imageinfo'][0]['url'])
            time.sleep(0.1)
            
        return urls
    except Exception as e:
        print(f"  [!] Error searching for '{query}': {e}")
        return []

def extract_search_term(text):
    text = text.replace('\n', ' ').strip()
    if "identify the" in text.lower():
        match = re.search(r'identify the ([a-zA-Z0-9\-\s]+)', text, re.I)
        if match:
            term = match.group(1).strip()
            if term.lower() not in ["following", "image", "condition", "mismatch", "incorrect statement"]:
                return term
                
    match = re.search(r'(\d+-year-old [a-zA-Z]+) presents with ([^.?!]+)', text, re.I)
    if match:
        p_with = match.group(2).strip()
        return p_with.split(',')[0].split(' and ')[0]

    keywords = ["x-ray", "ct scan", "mri", "histology", "biopsy", "organism", "chromosome", "syndrome", "fracture", "disease", "carcinoma"]
    for kw in keywords:
        if kw in text.lower():
            match = re.search(r'([a-zA-Z]+\s' + kw + r'\s[a-zA-Z]+)', text, re.I)
            if match: return match.group(1)
            return kw

    words = text.split()
    start_idx = 1 if words[0].lower() in ["a", "an", "the"] else 0
    if len(words) > 2 and "year-old" in words[1]: start_idx = 3
    return " ".join(words[start_idx:start_idx+5]).split('?')[0].split('.')[0].strip()

def aggressive_norm(t):
    t = html.unescape(html.unescape(t))
    return re.sub(r'[^a-z0-9]', '', t.lower())

def extract_array_by_brackets(content, start_index):
    bracket_count = 0
    in_string = False
    string_char = ''
    escape = False
    
    for i in range(start_index, len(content)):
        char = content[i]
        if escape: escape = False; continue
        if char == '\\' and in_string: escape = True; continue
            
        if not in_string:
            if char in '"\'': in_string = True; string_char = char
            elif char == '[': bracket_count += 1
            elif char == ']':
                bracket_count -= 1
                if bracket_count == 0: return content[start_index:i+1], i+1
        else:
            if char == string_char: in_string = False
    return None, None

def clean_js_to_json(text):
    text = text.replace(r'\u0026quot;', '"').replace(r'\u0026gt;', '>')
    text = text.replace(r'\u0026lt;', '<').replace(r'\u0026amp;', '&')
    text = text.replace(r'\u0026#x27;', "'").replace(r"\'", "'")
    text = re.sub(r'([{,]\s*)([a-zA-Z0-9_]+)(\s*:)', r'\1"\2"\3', text)
    text = re.sub(r',\s*([\]}])', r'\1', text)
    return text

# --- CORE LOGIC ---

def process_file(file_path, cache):
    global new_sources_count
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    filename = os.path.basename(file_path)
    print(f"\n- Checking {filename}...")

    # Both srcdoc strings and standard JS objects inside <script> blocks
    pattern_srcdoc = re.compile(r'(<iframe[^>]*srcdoc=(["\']))(.*?)\2', re.S | re.I)
    matches_srcdoc = list(pattern_srcdoc.finditer(content))
    
    pattern_script = re.compile(r'(var\s*questions\s*=\s*)(?=\[)', re.S | re.I)
    matches_script = list(pattern_script.finditer(content)) if not matches_srcdoc else []
    
    if not matches_srcdoc and not matches_script:
        print("  - No valid question containers found.")
        return False
        
    file_modified = False
    new_content_raw = []
    last_pos = 0
    
    total_injected = 0

    # Handle SRCDOC Iframes
    for match in matches_srcdoc:
        new_content_raw.append(content[last_pos:match.start(3)])
        srcdoc_raw = match.group(3)
        srcdoc = html.unescape(srcdoc_raw)
        if '&lt;' in srcdoc and '&gt;' in srcdoc and not '<' in srcdoc:
            srcdoc = html.unescape(srcdoc)

        q_data_matches = list(re.finditer(r'questions\s*=\s*(?=\[)', srcdoc))
        if q_data_matches:
            updated_any = False
            for q_m in reversed(q_data_matches):
                start_idx = q_m.end()
                json_str, end_idx = extract_array_by_brackets(srcdoc, start_idx)
                
                if json_str:
                    try:
                        try:
                            questions = json.loads(json_str)
                        except:
                            questions = json.loads(clean_js_to_json(json_str))
                            
                        injected_count = process_questions(questions, cache)
                        if injected_count > 0:
                            total_injected += injected_count
                            updated_any = True
                            file_modified = True
                            new_json_str = json.dumps(questions, separators=(',', ':'), ensure_ascii=True)
                            srcdoc = srcdoc[:start_idx] + new_json_str + srcdoc[end_idx:]
                    except Exception as e:
                        print(f"  [!] Failed parsing JSON chunk: {e}")
            if updated_any:
                updated_srcdoc_escaped = html.escape(srcdoc).replace('"', '&quot;')
                new_content_raw.append(updated_srcdoc_escaped)
            else:
                new_content_raw.append(srcdoc_raw)
        else:
            new_content_raw.append(srcdoc_raw)
        last_pos = match.end(3)

    # Handle standard SCRIPT tags (If no srcdoc found)
    for match in matches_script:
        new_content_raw.append(content[last_pos:match.end(1)])
        start_idx = match.end(1)
        json_str, end_idx = extract_array_by_brackets(content, start_idx)
        
        if json_str:
             try:
                 questions = json.loads(clean_js_to_json(json_str))
                 injected_count = process_questions(questions, cache)
                 if injected_count > 0:
                      total_injected += injected_count
                      file_modified = True
                      new_json_str = json.dumps(questions, separators=(',', ':'), ensure_ascii=True)
                      new_content_raw.append(new_json_str)
                      last_pos = end_idx
                      continue
             except Exception as e:
                 print(f"  [!] Failed parsing JSON chunk script: {e}")
        # Default behavior if parsing fails or no updates
        new_content_raw.append(content[last_pos:end_idx if json_str else match.end(1)])
        last_pos = end_idx if json_str else match.end(1)

    new_content_raw.append(content[last_pos:])
    
    if file_modified:
        final_content = "".join(new_content_raw)
        backup_path = file_path + ".bak"
        if not os.path.exists(backup_path):
            os.rename(file_path, backup_path)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(final_content)
        print(f"  SUCCESS: Saved {filename} with {total_injected} new image(s) injected!")
        return True
    else:
        print("  - No missing images or no new images sourced.")
        return False

def process_questions(questions, cache):
    global new_sources_count
    injected_count = 0
    keywords = ["image", "figure", "shown below", "diagram", "photograph", "x-ray", "scan", "ecg", "picture", "graph"]

    for q in questions:
        text = str(q.get('text', ''))
        q_imgs = q.get('question_images', [])
        e_imgs = q.get('explanation_images', [])
        
        needs_image = any(k in text.lower() for k in keywords)
        has_images = len(q_imgs) > 0 and 'http' in str(q_imgs)
        
        if needs_image and not has_images:
            norm_q = aggressive_norm(text)
            
            # 1. Use existing explanation images if available
            if e_imgs and len(e_imgs) > 0:
                q['question_images'] = e_imgs
                injected_count += 1
                continue
                
            # 2. Check general cache
            elif norm_q in cache:
                if cache[norm_q]:
                    q['question_images'] = cache[norm_q]
                    injected_count += 1
                continue
                
            # 3. Source newly from Wikipedia
            else:
                search_term = extract_search_term(text)
                print(f"    Sourcing WP for: {search_term}")
                sourced_urls = get_wikipedia_images(search_term)
                
                # Retry with shorter term if failed
                if not sourced_urls and len(search_term.split()) > 2:
                    search_term = " ".join(search_term.split()[:2])
                    sourced_urls = get_wikipedia_images(search_term)
                
                cache[norm_q] = sourced_urls if sourced_urls else []
                new_sources_count += 1
                
                if sourced_urls:
                    q['question_images'] = sourced_urls
                    injected_count += 1
                    
                # Save cache every 10 API bounds
                if new_sources_count % 10 == 0:
                    with open(CACHE_FILE, 'w', encoding='utf-8') as cf:
                        json.dump(cache, cf)
                        
                time.sleep(0.5)
                
    return injected_count

def run_all():
    global new_sources_count
    new_sources_count = 0
    
    # Init Cache
    cache = {}
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            cache = json.load(f)
            
    # Also pre-populate from sourced_grand_tests_v1.json (Migrate old data)
    if os.path.exists(r"c:\Users\91997\Downloads\MbbsWorld\papers\sourced_grand_tests_v1.json"):
        with open(r"c:\Users\91997\Downloads\MbbsWorld\papers\sourced_grand_tests_v1.json", 'r', encoding='utf-8') as f:
            old_data = json.load(f)
            for item in old_data:
                if item.get('sourced_images'):
                    norm_txt = aggressive_norm(item['text'])
                    cache[norm_txt] = item['sourced_images']

    # Filter files
    files = [f for f in os.listdir(PAPERS_DIR) if f.endswith('.html')]
    print(f"Starting fully automated image restoration across {len(files)} HTML files...")
    
    total_files_updated = 0
    start_time = time.time()
    
    for filename in files:
        file_path = os.path.join(PAPERS_DIR, filename)
        if process_file(file_path, cache):
            total_files_updated += 1
            
    # Final Cache Save
    with open(CACHE_FILE, 'w', encoding='utf-8') as cf:
        json.dump(cache, cf)
        
    print("\n" + "="*50)
    print(f"COMPLETION REPORT")
    print(f"Total HTML files updated: {total_files_updated}")
    print(f"New unique images sourced: {new_sources_count}")
    print(f"Execution time: {(time.time() - start_time) / 60:.2f} minutes")
    print("="*50)

if __name__ == "__main__":
    run_all()
