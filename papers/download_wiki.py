import urllib.request
import sys
import traceback

print("Starting script...", flush=True)

if len(sys.argv) < 3:
    print("Usage: python download_wiki.py <url> <output_file>", flush=True)
    sys.exit(1)

url = sys.argv[1]
output_file = sys.argv[2]
print(f"Target URL: {url}", flush=True)
print(f"Output File: {output_file}", flush=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
}

req = urllib.request.Request(url, headers=headers)
try:
    print("Sending request...", flush=True)
    with urllib.request.urlopen(req) as response:
        print(f"Response code: {response.getcode()}", flush=True)
        content = response.read().decode('utf-8')
        print(f"Content length: {len(content)}", flush=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Saved to {output_file}", flush=True)
except Exception:
    print("Exception occurred:", flush=True)
    traceback.print_exc()
