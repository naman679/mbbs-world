import urllib.request
import sys
import re
import json

topics = {
    "Defibrillation": "https://en.wikipedia.org/wiki/Defibrillation",
    "CPR": "https://en.wikipedia.org/wiki/Cardiopulmonary_resuscitation",
    "Intubation": "https://en.wikipedia.org/wiki/Tracheal_intubation",
    "Propofol": "https://en.wikipedia.org/wiki/Propofol", 
    "Aortic_Dissection": "https://en.wikipedia.org/wiki/Aortic_dissection",
    "Esophageal_Perforation": "https://en.wikipedia.org/wiki/Esophageal_rupture",
    "Trichobezoar": "https://en.wikipedia.org/wiki/Trichobezoar",
    "Capsule_Endoscopy": "https://en.wikipedia.org/wiki/Capsule_endoscopy",
    "Capnography": "https://en.wikipedia.org/wiki/Capnography",
    "LAST": "https://en.wikipedia.org/wiki/Local_anesthetic", 
    "Cystinuria": "https://en.wikipedia.org/wiki/Cystinuria",
    "Aspirin": "https://en.wikipedia.org/wiki/Aspirin",
    "Abetalipoproteinemia": "https://en.wikipedia.org/wiki/Abetalipoproteinemia",
    "Porphyria": "https://en.wikipedia.org/wiki/Congenital_erythropoietic_porphyria"
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
}

results = {}

for name, url in topics.items():
    print(f"Checking {name}...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            content = response.read().decode('utf-8')
            
            # Check for images
            # Look for og:image or infobox image
            img_match = re.search(r'<meta property="og:image" content="(.*?)"', content)
            img_url = img_match.group(1) if img_match else None
            
            if not img_url:
                # Fallback to loose img src match
                # thumbimage or infobox image
                inner_match = re.search(r'src="(//upload\.wikimedia\.org/[^"]+)"', content)
                if inner_match:
                    img_url = "https:" + inner_match.group(1)
            
            if img_url:
                results[name] = {"page": url, "image": img_url, "status": "FOUND"}
            else:
                results[name] = {"page": url, "image": None, "status": "NO_IMAGE"}
                
    except Exception as e:
        print(f"Failed {name}: {e}")
        results[name] = {"page": url, "error": str(e), "status": "ERROR"}

with open("wiki_image_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("Done.")
