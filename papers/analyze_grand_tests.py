import re
import html

files = ["cereb_g_t.html", "prep_tests_combined.html"]

for filename in files:
    print(f"--- Analyzing {filename} ---")
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            # Read first 1MB to find some iframes
            head = f.read(1000000)
            matches = list(re.finditer(r'<iframe[^>]*srcdoc="([^"]*)"[^>]*>', head))
            print(f"Found {len(matches)} iframes in first 1MB")
            
            for i, m in enumerate(matches[:2]):
                srcdoc = html.unescape(m.group(1))
                print(f"Iframe {i} structure:")
                # Check for questions variable
                found = False
                for var_type in ["let", "var", "const", ""]:
                    pattern = f"{var_type} questions = [" if var_type else "questions = ["
                    idx = srcdoc.find(pattern)
                    if idx == -1:
                        pattern = f"{var_type} questions=[" if var_type else "questions=["
                        idx = srcdoc.find(pattern)
                    if idx != -1:
                        print(f"  Found '{pattern}' at {idx}")
                        # Peek at first question
                        print(srcdoc[idx:idx+200])
                        found = True
                        break
                if not found:
                    print("  'questions =' not found in this iframe head")
    except Exception as e:
        print(f"Error reading {filename}: {e}")
