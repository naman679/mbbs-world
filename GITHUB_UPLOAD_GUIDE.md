# 🚀 Quick Guide: Upload Quiz Files to GitHub

## One-Time Setup (5 minutes)

### Step 1: Create a GitHub Personal Access Token

1. Go to: **https://github.com/settings/tokens**
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: `Upload Quiz Files`
4. Under "Select scopes", check: ✅ **repo** (Full control of private repositories)
5. Scroll down and click **"Generate token"**
6. **IMPORTANT**: Copy the token immediately (it looks like `ghp_xxxxxxxxxxxx`)

### Step 2: Add Token to the Upload Script

1. Open: `c:\Users\91997\Downloads\MbbsWorld\upload_to_github.py`
2. Find line 10: `GITHUB_TOKEN = ""`
3. Paste your token between the quotes: `GITHUB_TOKEN = "ghp_your_token_here"`
4. Save the file (Ctrl+S)

---

## Upload Files to GitHub (2 clicks)

### Option A: Double-click the script
1. Double-click **`upload_to_github.py`** in File Explorer
2. The script will automatically:
   - Upload `cereb_g_t.html` to GitHub
   - Create a commit with a descriptive message
   - Trigger GitHub Pages to rebuild your site
3. Wait 1-2 minutes for deployment
4. Check your live site!

### Option B: Run from command line
```powershell
cd c:\Users\91997\Downloads\MbbsWorld
python upload_to_github.py
```

---

## Upload Different Files

To upload other quiz files, edit the script and change:

```python
LOCAL_FILE = r"c:\Users\91997\Downloads\MbbsWorld\papers\cereb_g_t.html"
GITHUB_PATH = "quizzes/cereb_g_t.html"
```

To:

```python
LOCAL_FILE = r"c:\Users\91997\Downloads\MbbsWorld\papers\prep_tests_combined.html"
GITHUB_PATH = "quizzes/prep_tests_combined.html"
```

---

## Troubleshooting

### ❌ "GitHub token is not set"
- You forgot to add your token in Step 2
- Go back and paste your token where `GITHUB_TOKEN = ""`

### ❌ "File is larger than 100 MB"
- GitHub has a 100MB file size limit
- Your file might be too large due to many images
- Consider splitting the content or using Git LFS

### ❌ "Upload failed: 401"
- Your token is invalid or expired
- Create a new token following Step 1

### ❌ "Upload failed: 404"
- The repository path is wrong
- Make sure your GitHub username is `namanr79`
- Make sure your repo name is `mbbs-world`

---

## What Happens After Upload?

1. ✅ File is uploaded to GitHub immediately
2. 🔄 GitHub Actions starts building your site (1-2 min)
3. 🌐 Your live site updates automatically
4. 📧 You get an email notification (if enabled)

Check deployment status: https://github.com/namanr79/mbbs-world/actions

---

## Future Uploads

After the one-time setup, uploading is just:
1. Update your quiz files locally
2. Double-click `upload_to_github.py`
3. Done! ✨

No more manual copy-paste needed!
