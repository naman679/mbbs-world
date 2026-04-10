import hashlib
import urllib.request
import urllib.error

filenames = [
    "SOA-non_specific_Urethritis-male.jpg",
    "Plate_XVIII,_Pemphigus_foliaceus,_Crocker_1896_Wellcome_L0074328.jpg",
    "Pemphigus_foliaceus_dog_1.jpg",
    "Gonorrhea_in_the_male_-_a_practical_guide_to_its_treatment_(1911)_(14799803513).jpg"
]

for filename in filenames:
    filename = filename.replace(" ", "_")
    m = hashlib.md5()
    m.update(filename.encode('utf-8'))
    md5_hash = m.hexdigest()
    a = md5_hash[0]
    b = md5_hash[0:2]
    
    url = f"https://upload.wikimedia.org/wikipedia/commons/{a}/{b}/{filename}"
    
    try:
        req = urllib.request.Request(url, method='HEAD')
        req.add_header('User-Agent', 'Mozilla/5.0')
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print(f"VALID: {url}")
    except urllib.error.HTTPError as e:
        pass
    except Exception as e:
        print(f"Error checking {url}: {e}")
