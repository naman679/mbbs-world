import os

file_path = r"c:\Users\91997\Downloads\MbbsWorld\papers\previous_papers_inicet-aiims.html"

def fix_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Target the escaped HTML string in the JS in srcdoc
        # Pattern 1: <img src="${url}" ...
        # Escaped: &lt;img src=&quot;${url}&quot;
        
        target = '&lt;img src=&quot;${url}&quot;'
        replacement = '&lt;img referrerpolicy=&quot;no-referrer&quot; loading=&quot;lazy&quot; src=&quot;${url}&quot;'
        
        new_content = content.replace(target, replacement)
        
        if new_content == content:
            print("No changes made. Target string not found.")
        else:
            diff_count = (len(new_content) - len(content)) // (len(replacement) - len(target))
            print(f"Replaced {diff_count} occurrences.") # Approximate count based on length diff if only one type of replacement
            # Better count:
            count = content.count(target)
            print(f"Found {count} occurrences of target.")
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Successfully updated {path}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_file(file_path)
