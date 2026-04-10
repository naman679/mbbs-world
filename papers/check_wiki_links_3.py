import json
import urllib.request
import urllib.parse
import re
import time

# List of topics to search for images
topics = {
    "Pompe disease PAS muscle biopsy": ["Pompe disease", "Periodic acid-Schiff stain"],
    "Naclerio V sign": ["Boerhaave syndrome", "Pneumomediastinum"],
    "Griffith point anatomy": ["Splenic flexure", "Colic artery"],
    "Salter-Harris III": ["Salter-Harris fracture"],
    "MUGA scan": ["Multigated acquisition scan"],
    "Psittacosis LCL bodies": ["Psittacosis", "Chlamydia psittaci"],
    "TCA overdose ECG": ["TCA overdose ECG", "Ventricular tachycardia ECG"],
    "PICC line DVT ultrasound": ["DVT ultrasound", "Venous thrombosis"],
    "Waters view X-ray": ["Waters' view", "Paranasal sinus X-ray"],
    "Caldwell view X-ray": ["Caldwell's view", "Paranasal sinus X-ray"],
    "Rhese view X-ray": ["Optic canal X-ray"],
    "Submentovertical view X-ray": ["Submentovertical view", "Skull base X-ray"],
    "Gallium-67 scan ear": ["Gallium scan"],
    "Technetium-99m scan bone": ["Bone scan", "Technetium-99m"],
    "Glomus tympanicum reddish mass": ["Glomus tympanicum", "Tympanic membrane"],
    "Subglottic stenosis CT": ["Subglottic stenosis", "Larynx CT"],
    "Vesicovaginal fistula 3 swab test": ["Vesicovaginal fistula"],
    "Unicornuate uterus HSG": ["Unicornuate uterus", "HSG"],
    "Partograph": ["Partogram", "Partograph"],
    "Endometrial polyp USG": ["Endometrial polyp ultrasound"],
    "Canon ball metastases X-Ray": ["Cannon-ball metastases", "Choriocarcinoma"],
    "Turner syndrome streak ovaries": ["Streak ovary", "Turner syndrome"],
    "Lucid interval extradural hematoma": ["Epidural hematoma CT", "Lucid interval"],
    "Pisiform bone ossification": ["Wrist radiograph", "Pisiform bone"],
    "Myocardial infarction ECG": ["STEMI ECG", "Myocardial infarction"],
    "Arsenic poisoning raindrop pigmentation": ["Arsenic poisoning skin", "Hyperpigmentation"],
    "Barium carbonate poisoning": ["Hypokalemia ECG", "Ventricular ectopic ECG"],
    "Flow cytometry histogram dot plot": ["Flow cytometry dot plot"],
    "Ishikawa diagram": ["Ishikawa diagram"],
    "Demographic cycle": ["Demographic transition model"]
}

def get_wiki_image(search_term):
    try:
        headers = {'User-Agent': 'MbbsWorldAuditTool/1.0 (contact: user@example.com)'}
        
        # Search for the page
        encoded_term = urllib.parse.quote(search_term)
        search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={encoded_term}&format=json"
        
        req = urllib.request.Request(search_url, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if not data.get('query', {}).get('search'):
                print(f"  No search results for: {search_term}")
                return None
            title = data['query']['search'][0]['title']
            print(f"  Found title: {title}")
            
        # Get images from the page
        encoded_title = urllib.parse.quote(title)
        image_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={encoded_title}&prop=pageimages|images&format=json&pithumbsize=500"
        
        req = urllib.request.Request(image_url, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            pages = data['query']['pages']
            page_id = list(pages.keys())[0]
            page_data = pages[page_id]
            
            # Try page image (thumbnail) first
            if 'thumbnail' in page_data:
                return page_data['thumbnail']['source']
            
            # Otherwise look at the images list
            if 'images' in page_data:
                print(f"  Checking {len(page_data['images'])} images for {title}...")
                for img in page_data['images']:
                    img_title = img['title']
                    if any(ext in img_title.lower() for ext in ['.jpg', '.jpeg', '.png']):
                        # Get actual URL for this image
                        encoded_img = urllib.parse.quote(img_title)
                        img_info_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={encoded_img}&prop=imageinfo&iiprop=url&format=json"
                        req_img = urllib.request.Request(img_info_url, headers=headers)
                        with urllib.request.urlopen(req_img) as img_resp:
                            img_data = json.loads(img_resp.read().decode())
                            img_pages = img_data['query']['pages']
                            img_page_id = list(img_pages.keys())[0]
                            if 'imageinfo' in img_pages[img_page_id]:
                                return img_pages[img_page_id]['imageinfo'][0]['url']
        return None
    except Exception as e:
        print(f"Error searching for {search_term}: {e}")
        return None
    except Exception as e:
        print(f"Error searching for {search_term}: {e}")
        return None

if __name__ == "__main__":
    results = {}
    for topic, search_terms in topics.items():
        print(f"Searching for {topic}...")
        found = False
        for term in search_terms:
            img_url = get_wiki_image(term)
            if img_url:
                results[topic] = img_url
                print(f"  Found: {img_url}")
                found = True
                break
        if not found:
            print(f"  No image found for {topic}")
        time.sleep(0.1) # Be nice to API

    with open("wiki_image_results_3.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nSearch complete. Results saved to wiki_image_results_3.json")
