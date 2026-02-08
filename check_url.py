import urllib.request
import urllib.error

urls = [
    "https://dbmi-data.s3.ap-south-1.amazonaws.com/photos-1692720343787-QTDFPYQ007IMG1.JPG",
    "https://dbmi-data.s3.ap-south-1.amazonaws.com/photos-1692720344756-QTDFPYQ010IMG1.JPG" 
]

print("Checking Image URLs...")
for url in urls:
    try:
        request = urllib.request.Request(url, method='HEAD')
        with urllib.request.urlopen(request, timeout=5) as response:
            print(f"URL: {url}")
            print(f"Status Code: {response.status}")
            print(f"Content-Type: {response.headers.get('Content-Type')}")
    except urllib.error.HTTPError as e:
        print(f"Error checking {url}: HTTP {e.code} - {e.reason}")
    except Exception as e:
        print(f"Error checking {url}: {e}")
