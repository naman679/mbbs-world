import json
import re
import os
import html

# Load image map
with open("wiki_image_results_3.json", "r") as f:
    wiki_results = json.load(f)

image_map = {
    "Water's view": wiki_results.get("Waters view X-ray"),
    "Caldwell": wiki_results.get("Caldwell view X-ray"),
    "Rhese": wiki_results.get("Rhese view X-ray"),
    "Submentovertical": wiki_results.get("Submentovertical view X-ray"),
    "SMV view": wiki_results.get("Submentovertical view X-ray"),
}

filename = "CEREB_ENT.html"
with open(filename, 'r', encoding='utf-8') as f:
    content = f.read()

def sanitize_json(text):
    text = re.sub(r'([{,]\s*)(\w+):', r'\1"\2":', text)
    text = re.sub(r',\s*([\]}])', r'\1', text)
    return text

iframes = re.findall(r'<iframe[^>]*srcdoc="[^"]*"[^>]*></iframe>', content, flags=re.DOTALL)
print(f"Found {len(iframes)} iframes")

for i, iframe_tag in enumerate(iframes):
    srcdoc_match = re.search(r'srcdoc="([^"]+)"', iframe_tag)
    if not srcdoc_match: continue
    srcdoc = html.unescape(srcdoc_match.group(1))
    q_match = re.search(r'var\s+questions\s*=\s*(\[.*?\])\s*;', srcdoc, re.DOTALL)
    if not q_match:
        print(f"  Iframe {i}: No questions array found")
        continue
    
    q_json_str = q_match.group(1)
    sanitized = sanitize_json(q_json_str)
    try:
        questions = json.loads(sanitized)
        print(f"  Iframe {i}: Found {len(questions)} questions")
        for q in questions:
            q_text = (q.get('text', '') + " " + " ".join([str(o.get('text','')) for o in q.get('options', [])])).lower()
            if not q.get('question_images'):
                for kw in image_map:
                    if kw.lower() in q_text:
                        print(f"    Match! '{kw}' found in question: {q.get('text')[:50]}...")
    except Exception as e:
        print(f"  Iframe {i}: JSON Error: {e}")
