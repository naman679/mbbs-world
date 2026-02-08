import os
import glob

def fix_files():
    files = glob.glob('c:/Users/91997/Downloads/MbbsWorld/papers/*.html')
    
    replacements = {
        r'\u0026gt;': '>',
        r'\u0026lt;': '<',
        r'\u0026quot;': '"',
        r'\u0026amp;': '&',
        r'\u0026#x27;': "'"
    }
    
    print(f"Fixing {len(files)} files...")
    
    for file_path in files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        for old, new in replacements.items():
            new_content = new_content.replace(old, new)
            
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed: {os.path.basename(file_path)}")
        else:
             print(f"Skipped (no changes): {os.path.basename(file_path)}")

if __name__ == '__main__':
    fix_files()
