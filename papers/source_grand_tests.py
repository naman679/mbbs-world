import json
import urllib.request
import urllib.parse
import re
import time
import os

def get_wikipedia_images(query):
    try:
        # 1. Search for the most relevant page
        search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&format=json"
        
        headers = {'User-Agent': 'MedicalAuditBot/1.0 (contact: user@example.com)'}
        req = urllib.request.Request(search_url, headers=headers)
        
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
        if not data.get('query', {}).get('search'):
            return []
            
        page_title = data['query']['search'][0]['title']
        
        # 2. Get images from that page
        img_query_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(page_title)}&prop=images&format=json"
        req = urllib.request.Request(img_query_url, headers=headers)
        
        with urllib.request.urlopen(req) as response:
            img_data = json.loads(response.read().decode())
            
        pages = img_data.get('query', {}).get('pages', {})
        page_id = list(pages.keys())[0]
        images = pages[page_id].get('images', [])
        
        # Filter for useful image types (svg/png/jpg) and exclude icons
        image_titles = [img['title'] for img in images if any(img['title'].lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.svg'])]
        # Exclude common meta/icon images
        image_titles = [t for t in image_titles if not any(x in t.lower() for x in ['icon', 'logo', 'edit-clear', 'magnifying_glass', 'ambox', 'commons-logo'])]
        
        if not image_titles:
            return []
            
        # 3. Get actual URLs for the first few images
        urls = []
        for title in image_titles[:3]:  # Try top 3 images
            info_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(title)}&prop=imageinfo&iiprop=url&format=json"
            req = urllib.request.Request(info_url, headers=headers)
            with urllib.request.urlopen(req) as response:
                info_data = json.loads(response.read().decode())
                info_pages = info_data.get('query', {}).get('pages', {})
                info_id = list(info_pages.keys())[0]
                if 'imageinfo' in info_pages[info_id]:
                    urls.append(info_pages[info_id]['imageinfo'][0]['url'])
            time.sleep(0.1)  # Throttling
            
        return urls
    except Exception as e:
        print(f"Error searching for '{query}': {e}")
        return []

def extract_search_term(text):
    text = text.replace('\n', ' ').strip()
    
    # Specific medical/clinical search triggers
    if "identify the" in text.lower():
        match = re.search(r'identify the ([a-zA-Z0-9\-\s]+)', text, re.I)
        if match:
            term = match.group(1).strip()
            # If it's too generic like "following", skip it
            if term.lower() not in ["following", "image", "condition", "mismatch", "incorrect statement"]:
                return term
                
    # Clinical presentation extraction
    match = re.search(r'(\d+-year-old [a-zA-Z]+) presents with ([^.?!]+)', text, re.I)
    if match:
        p_type = match.group(1)
        p_with = match.group(2).strip()
        # Clean up symptoms (take first part)
        symptoms = p_with.split(',')[0].split(' and ')[0]
        return f"{symptoms}"

    # Keyword extraction
    keywords = ["x-ray", "ct scan", "mri", "histology", "biopsy", "organism", "chromosome", "syndrome", "fracture"]
    for kw in keywords:
        if kw in text.lower():
            # Find the word before and after
            match = re.search(r'([a-zA-Z]+\s' + kw + r'\s[a-zA-Z]+)', text, re.I)
            if match:
                return match.group(1)
            return kw

    # Fallback: Clinical nouns (first few words)
    words = text.split()
    # Skip "A", "An", "The", "A 22-year-old"
    start_idx = 0
    if words[0].lower() in ["a", "an", "the"]:
        start_idx = 1
    if len(words) > 2 and "year-old" in words[1]:
        start_idx = 3
        
    return " ".join(words[start_idx:start_idx+5]).split('?')[0].split('.')[0].strip()

def main():
    # Load previously sourced images to avoid redundant API calls
    sourced_map = {}
    if os.path.exists('sourced_grand_tests_v1.json'):
        with open('sourced_grand_tests_v1.json', 'r', encoding='utf-8') as f:
            old_data = json.load(f)
            for item in old_data:
                # Store clinical sourced images (not the reused explanation ones if any)
                if item.get('sourced_images'):
                    # Use normalized text as key
                    norm_txt = re.sub(r'[^a-z0-9]', '', item['text'].lower())
                    sourced_map[norm_txt] = item['sourced_images']

    with open('extracted_grand_tests.json', 'r', encoding='utf-8') as f:
        questions = json.load(f)
        
    results = []
    max_to_source = 1000
    source_count = 0
    
    for q in questions:
        norm_q = re.sub(r'[^a-z0-9]', '', q['text'].lower())
        
        # 1. Check if we already have sourced images for this text
        if norm_q in sourced_map:
            q['sourced_images'] = sourced_map[norm_q]
            results.append(q)
            continue
            
        # 2. Check if it has explanation images to reuse
        if q.get('explanation_images'):
            q['sourced_images'] = q.get('explanation_images', [])
            results.append(q)
            continue
            
        # 3. Otherwise, source from Wikipedia (if within batch limit)
        if source_count < max_to_source:
            search_term = extract_search_term(q['text'])
            print(f"[{source_count+1}] Sourcing for: {search_term}")
            
            sourced = get_wikipedia_images(search_term)
            if not sourced and len(search_term.split()) > 2:
                 search_term = " ".join(search_term.split()[:2])
                 sourced = get_wikipedia_images(search_term)
                 
            q['sourced_images'] = sourced if sourced else []
            results.append(q)
            source_count += 1
            
            if source_count % 10 == 0:
                with open('sourced_grand_tests_v1.json', 'w', encoding='utf-8') as f:
                    json.dump(results, f, indent=2)
                print(f"  Saved progress: {len(results)} items")
            
            time.sleep(0.5)
        else:
            # Keep the question in results but without new sourced images
            q['sourced_images'] = []
            results.append(q)
            
    with open('sourced_grand_tests_v1.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    print(f"Total processed: {len(results)}. Sourced new: {source_count}")

if __name__ == "__main__":
    main()
