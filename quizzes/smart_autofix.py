import os
import re
import time

try:
    import google.generativeai as genai
    from duckduckgo_search import DDGS
except ImportError:
    print("Error: Please run 'pip install google-generativeai duckduckgo-search' in your terminal.")
    exit()

# 1. Insert your free API Key here
 
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-pro')
ddgs = DDGS()

def get_smart_query(question_text):
    # The AI acts as a medical student to determine the exact image needed
    prompt = f"I need a medical diagram for this MBBS exam question: '{question_text}'. Generate a highly specific, 3 to 5 word image search query. Example: 'duodenal atresia double bubble xray'. Reply ONLY with the exact search query text, nothing else."
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"  AI Error - Using fallback search: {e}")
        return question_text[:60] + " medical diagram"

def is_unsearchable(text):
    # Skips questions that are just matching letters or have no context
    if len(text) < 5 or re.match(r'^[A-D]-\d.*', text) or text.lower() == "none of the above":
        return True
    return False

def auto_fix_all_files():
    url_pattern = re.compile(r'https://cerebellum-web-static\.s3\.amazonaws\.com/[a-zA-Z0-9_./%-]+')
    html_files = [f for f in os.listdir('.') if f.endswith('.html')]
    
    print(f"Found {len(html_files)} HTML files. Starting Smart AI Update...\n")
    
    for filename in html_files:
        print(f"Processing: {filename}...")
        try:
            with open(filename, 'r', encoding='utf-8') as file:
                content = file.read()
                
            matches = list(url_pattern.finditer(content))
            if not matches:
                continue
                
            replacements = {}
            for match in matches:
                old_url = match.group(0)
                if old_url in replacements:
                    continue 
                    
                text_idx = content.rfind('&quot;text&quot;:', 0, match.start())
                if text_idx == -1:
                    text_idx = content.rfind('"text":', 0, match.start())
                    
                question_text = ""
                if text_idx != -1:
                    sub = content[text_idx:text_idx+800] 
                    q_match = re.search(r'text(?:&quot;|")\s*:\s*(?:&quot;|")(.*?)(?:&quot;|")', sub, re.IGNORECASE)
                    if q_match:
                        question_text = re.sub(r'<[^>]+>', ' ', q_match.group(1)).strip()
                        question_text = question_text.replace('\\n', ' ').replace('\\r', '')
                
                if not question_text or is_unsearchable(question_text):
                    new_url = "https://via.placeholder.com/600x400.png?text=Context+Missing"
                else:
                    # Use AI to get the smart search query
                    print(f"  Reading question: {question_text[:50]}...")
                    smart_query = get_smart_query(question_text)
                    print(f"  AI suggests searching for: '{smart_query}'")
                    
                    # Search the web with the smart query
                    try:
                        results = ddgs.images(smart_query, max_results=1)
                        if results and len(results) > 0:
                            new_url = results[0]['image']
                            time.sleep(1.5) # Pause to prevent search engine blocking
                        else:
                            new_url = "https://via.placeholder.com/600x400.png?text=Image+Not+Found"
                    except Exception as e:
                        new_url = "https://via.placeholder.com/600x400.png?text=Search+Error"
                        time.sleep(2)
                        
                replacements[old_url] = new_url
                
            # Update the HTML file
            for old_url, new_url in replacements.items():
                content = content.replace(old_url, new_url)
                
            with open(filename, 'w', encoding='utf-8') as file:
                file.write(content)
            print(f"  Successfully updated images in {filename}\n")
            
        except Exception as e:
            print(f"Error processing {filename}: {e}\n")

auto_fix_all_files()
