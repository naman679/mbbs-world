import sys
import os

if len(sys.argv) < 3:
    print("Usage: python find_question.py <filename> <snippet>")
    sys.exit(1)

filename = sys.argv[1]
snippet = sys.argv[2]
papers_dir = r"c:\Users\91997\Downloads\MbbsWorld\papers"
file_path = os.path.join(papers_dir, filename)

if not os.path.exists(file_path):
    # Try absolute path
    if os.path.exists(filename):
        file_path = filename
    else:
        print(f"File not found: {file_path}")
        sys.exit(1)

try:
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
except Exception as e:
    print(f"Error reading file: {e}")
    sys.exit(1)

print(f"Searching in: {file_path}")
print(f"Snippet: {snippet}")

pos = content.find(snippet)
if pos != -1:
    print(f"FOUND at position {pos}")
    # Print context: 50 chars before and 1000 chars after
    start = max(0, pos - 50)
    end = min(len(content), pos + 1000)
    context = content[start:end]
    print("--- CONTEXT START ---")
    print(context)
    print("--- CONTEXT END ---")
else:
    print("Snippet NOT FOUND")
