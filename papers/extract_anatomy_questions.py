import json
import re
import html
import os

filename = "CEREB_Anatomy.html"
papers_dir = r"c:\Users\91997\Downloads\MbbsWorld\papers"
file_path = os.path.join(papers_dir, filename)

snippets = [
    "A 48-year-old woman undergoes a CT scan of the abdomen for evaluation of chronic right upper quadran",
    "A 50-year-old man presents with a sudden onset of ataxia and difficulty coordinating his movements",
    "A 60-year-old patient presents with chronic hip pain. On X-ray, you observe a bony projection extend",
    "A 55-year-old male patient presents with lower limb swelling, pain, and discomfort. Duplex ultrasono",
    "A 55-year-old man with a 30-year history of smoking presents to your clinic complaining of a persist",
    "An 18-year-old female while driving her Two-Wheeler accidentally collided with a Car from the Opposi",
    "A 28-year-old girl realized that she felt very exhausted and tired after a short walk. She also expe"
]

extracted_data = []

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()
    # Optional: unescape if needed, but questions might be in JSON format
    # The file has questions = [ ... ]

for snippet in snippets:
    pos = content.find(snippet)
    if pos != -1:
        # Try to extract the full object. It's likely inside a JSON object or string.
        # We'll just grab a chunk and try to clean it mentally or let the user see it.
        # But better: find the start and end of the question object if possible.
        # Simplest: grab 1000 chars.
        start = max(0, pos - 50)
        end = min(len(content), pos + 1500)
        chunk = content[start:end]
        extracted_data.append({
            "snippet": snippet,
            "found": True,
            "context": chunk
        })
    else:
        extracted_data.append({
            "snippet": snippet,
            "found": False,
            "context": "NOT FOUND"
        })

with open("anatomy_questions.json", "w", encoding="utf-8") as f:
    json.dump(extracted_data, f, indent=2)

print("Extraction complete. check anatomy_questions.json")
