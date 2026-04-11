import requests

# --- CONFIGURATION ---
GITHUB_TOKEN = "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"
REPO_OWNER = "naman679"
REPO_NAME = "mbbs-world"
BRANCH = "main"

FILES_TO_DELETE = [
    "atrium.html",
    "css/atrium.css",
    "js/atrium.js",
]

def delete_file(file_path):
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{file_path}"
    
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }

    # 1. Get the current file's SHA
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        sha = response.json().get("sha")
        
        # 2. Delete the file
        data = {
            "message": f"Remove {file_path} as requested",
            "sha": sha,
            "branch": BRANCH
        }
        
        del_response = requests.delete(url, headers=headers, json=data)
        if del_response.status_code == 200:
            print(f"Successfully deleted: {file_path}")
        else:
            print(f"Failed to delete {file_path}: {del_response.json().get('message')}")
    elif response.status_code == 404:
        print(f"Skipping {file_path}: Not found on GitHub.")
    else:
        print(f"Error checking {file_path}: {response.json().get('message')}")

if __name__ == "__main__":
    for file_path in FILES_TO_DELETE:
        delete_file(file_path)
