import re
import sys
import glob
import json

def extract_image(filename):
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    og_match = re.search(r'<meta property="og:image" content="(.*?)"', content)
    if og_match:
        return og_match.group(1)
        
    matches = re.findall(r'src="(//upload\.wikimedia\.org/wikipedia/commons/[^"]+\.(?:jpg|png|svg))"', content)
    
    for m in matches:
        if 'thumb' in m:
            return "https:" + m
            
    if matches:
        return "https:" + matches[0]
        
    return None

target_files = ["cantlie.html", "scp.html", "trabecula.html", "ivc_new.html", "plch_new.html", "leg.html", "coarctation.html"]

results = {}
for tf in target_files:
    try:
        url = extract_image(tf)
        if url:
            results[tf] = url
        else:
            results[tf] = None
    except FileNotFoundError:
        results[tf] = "FILE_NOT_FOUND"

with open("found_urls.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("Saved to found_urls.json")
