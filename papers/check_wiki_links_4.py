import json
import time
import urllib.request
import urllib.parse
import sys

search_terms = {
    "Venous ulcer": "Venous ulcer",
    "SCC": "Squamous cell carcinoma",
    "Syphilis": "Syphilis",
    "BCC": "Basal-cell carcinoma",
    "X-ray": "Chest X-ray",
    "ECG": "Electrocardiogram",
    "USG": "Medical ultrasound",
    "MRI": "Magnetic resonance imaging",
    "CT Scan": "CT scan",
    "Histology": "Histology",
    "Biopsy": "Biopsy",
    "Ovarian torsion": "Ovarian torsion",
    "Nutmeg liver": "Nutmeg liver",
    "Mallory-Weiss": "Mallory-Weiss tear",
    "Keratoconus": "Keratoconus",
    "Glaucoma": "Glaucoma",
    "Myopia": "Myopia",
    "Thymoma": "Thymoma",
    "Neuroblastoma": "Neuroblastoma",
    "Hepatoma": "Hereditary hepatocellular carcinoma",
    "Sarcoidosis": "Sarcoidosis",
    "Tuberculosis": "Tuberculosis",
    "Pneumonitis": "Hypersensitivity pneumonitis",
    "Myocardial infarction": "Myocardial infarction",
    "Appendicitis": "Appendicitis",
    "Cholelithiasis": "Cholelithiasis",
    "Polyp": "Colorectal polyp",
    "Adenocarcinoma": "Adenocarcinoma",
    "Flow cytometry": "Flow cytometry",
    "ECG rhythm": "Sinus rhythm",
    "ECG tachycardia": "Ventricular tachycardia",
    "Capnography": "Capnography"
}

results = {}

def get_wiki_image(term):
    url = "https://en.wikipedia.org/w/api.php"
    # Try page search first
    params = {
        "action": "query",
        "format": "json",
        "prop": "pageimages|images",
        "titles": term,
        "pithumbsize": 500
    }
    try:
        query_string = urllib.parse.urlencode(params)
        full_url = f"{url}?{query_string}"
        headers = {'User-Agent': 'MedicalAppBot/1.0 (contact: admin@example.com)'}
        req = urllib.request.Request(full_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            pages = data.get("query", {}).get("pages", {})
            for pid in pages:
                if pid == "-1": continue
                if "thumbnail" in pages[pid]:
                    return pages[pid]["thumbnail"]["source"]
                # Try to get first image from images list
                if "images" in pages[pid]:
                    for img in pages[pid]["images"]:
                        title = img["title"]
                        if any(ext in title.lower() for ext in [".jpg", ".jpeg", ".png"]):
                            # Get URL
                            img_params = {"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url", "titles": title}
                            img_resp = urllib.request.urlopen(urllib.request.Request(f"{url}?{urllib.parse.urlencode(img_params)}", headers=headers), timeout=10)
                            img_data = json.loads(img_resp.read().decode())
                            for ipid in img_data["query"]["pages"]:
                                if "imageinfo" in img_data["query"]["pages"][ipid]:
                                    return img_data["query"]["pages"][ipid]["imageinfo"][0]["url"]
            
        # If no page found, try search
        search_params = {"action": "query", "format": "json", "list": "search", "srsearch": term, "srlimit": 1}
        search_resp = urllib.request.urlopen(urllib.request.Request(f"{url}?{urllib.parse.urlencode(search_params)}", headers=headers), timeout=10)
        search_data = json.loads(search_resp.read().decode())
        if search_data.get("query", {}).get("search"):
            top_title = search_data["query"]["search"][0]["title"]
            # Recurse once with the top title
            return get_wiki_image(top_title)
            
    except Exception as e:
        pass
    return None

count = 0
for key, term in search_terms.items():
    count += 1
    print(f"[{count}/{len(search_terms)}] {key}...", end=" ", flush=True)
    img_url = get_wiki_image(term)
    if img_url:
        results[key] = img_url
        print(f"OK ({img_url[:50]}...)")
    else:
        print("FAIL")
    time.sleep(1)

with open("wiki_image_results_4.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"Final Count: {len(results)}")
