import os
import base64
import requests

# --- CONFIGURATION ---
GITHUB_TOKEN = "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"  # Replace with your Personal Access Token
REPO_OWNER = "naman679"
REPO_NAME = "mbbs-world"
BRANCH = "main"

# Files to upload (relative to script location)
FILES_TO_UPLOAD = [
    "index.html",
    "dashboard.html",
    "daily-case.html",
    "firebase-config.js",
    "js/dashboard.js",
    "js/login.js",
    "js/network-status.js",
    "js/daily-case.js",
    "css/dashboard.css",
    "css/login.css",
    "css/network-status.css",
    "css/daily-case.css",
]

def upload_file(file_path):
    if not os.path.exists(file_path):
        print(f"Skipping {file_path}: File not found.")
        return

    github_path = file_path.replace("\\", "/")  # Ensure forward slashes for GitHub
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{github_path}"
    
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }

    # Get the current file (if it exists) to get its SHA
    sha = None
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        sha = response.json().get("sha")

    # Read and encode file content
    with open(file_path, "rb") as f:
        content = base64.b64encode(f.read()).decode("utf-8")

    data = {
        "message": f"Update {github_path} via automation",
        "content": content,
        "branch": BRANCH
    }
    if sha:
        data["sha"] = sha

    # Push to GitHub
    put_response = requests.put(url, headers=headers, json=data)
    if put_response.status_code in [200, 201]:
        print(f"Successfully uploaded: {github_path}")
    else:
        print(f"Failed to upload {github_path}: {put_response.json().get('message')}")

if __name__ == "__main__":
    if GITHUB_TOKEN == "YOUR_GITHUB_TOKEN_HERE":
        print("Error: Please set your GITHUB_TOKEN in the script.")
    else:
        for file_path in FILES_TO_UPLOAD:
            upload_file(file_path)
