import os
import glob

def check_files():
    files = glob.glob('c:/Users/91997/Downloads/MbbsWorld/papers/*.html')
    patterns = [
        r'\u0026gt;',
        r'\u0026lt;',
        r'\u0026quot;',
        r'\u0026amp;',
        r'\u0026#x27;'
    ]
    
    print(f"Checking {len(files)} files for escaped patterns...")
    
    for file_path in files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        found = False
        counts = {}
        for p in patterns:
            count = content.count(p)
            if count > 0:
                counts[p] = count
                found = True
        
        if found:
            print(f"\n{os.path.basename(file_path)}:")
            for p, c in counts.items():
                print(f"  {p}: {c}")

if __name__ == '__main__':
    check_files()
