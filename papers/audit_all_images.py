import os
import re
import json
import html

PAPERS_DIR = r"c:\Users\91997\Downloads\MbbsWorld\papers"


def audit_files():
    report = []
    
    for filename in os.listdir(PAPERS_DIR):
        if not filename.endswith(".html"):
            continue
            
        file_path = os.path.join(PAPERS_DIR, filename)
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            raw_content = f.read()
            # Unescape to handle srcdoc content
            content = html.unescape(raw_content)

        # Find all question objects chunks
        # This regex looks for { "text": ..., "question_images": ... } roughly
        # It's not a perfect parser but should catch the standard format used in these files.
        question_pattern = re.compile(r'\{[^{}]*"text":\s*"(.*?)",[^{}]*"options".*?"question_images":\s*(\[.*?\]).*?\}', re.DOTALL)
        
        matches = question_pattern.finditer(content)
        
        # Convert iterator to list to count
        match_list = list(matches)
        print(f"File: {filename} - Found {len(match_list)} questions")
        
        count = 0
        missing_count = 0
        
        for m in match_list:
            count += 1
            question_text = m.group(1)
            images_array_str = m.group(2)
            
            # Check for keywords indicating an image is needed
            keywords = ["image", "figure", "shown below", "diagram", "photograph", "x-ray", "scan", "ecg", "picture", "graph"]
            text_lower = question_text.lower()
            
            needs_image = any(k in text_lower for k in keywords)
            
            # Check if images array is empty
            has_images = "http" in images_array_str # Simple check if there's a URL
            
            if needs_image and not has_images:
                missing_count += 1
                report.append({
                    "file": filename,
                    "question_snippet": question_text[:100] + "...",
                    "reason": "Text implies image but none found"
                })
            
            if has_images:
                 # Check for broken/placeholder URLs if we can (e.g. empty strings, "undefined")
                 if '""' in images_array_str or "''" in images_array_str or "undefined" in images_array_str:
                     missing_count += 1
                     report.append({
                        "file": filename,
                        "question_snippet": question_text[:100] + "...",
                        "reason": "Image array contains empty/undefined placeholder"
                     })

    return report

if __name__ == "__main__":
    print("Starting Audit...")
    issues = audit_files()
    
    with open("audit_report.txt", "w", encoding="utf-8") as f:
        if not issues:
            f.write("No obvious missing images found based on text keywords.\n")
            print("No issues found.") # Keep minimal stdout
        else:
            f.write(f"Found {len(issues)} potential missing images.\n")
            print(f"Found {len(issues)} issues. Writing to audit_report.txt")
            
            # Group by file
            files_issues = {}
            for i in issues:
                if i['file'] not in files_issues:
                    files_issues[i['file']] = []
                files_issues[i['file']].append(i)
                
            for fil, problems in files_issues.items():
                f.write(f"\nFile: {fil} ({len(problems)} issues)\n")
                for p in problems:
                    f.write(f"  - {p['reason']}: {p['question_snippet']}\n")
    print("Audit complete.")

