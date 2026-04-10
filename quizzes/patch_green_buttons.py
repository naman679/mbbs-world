import os
import glob
import re

QUIZ_DIR = os.path.dirname(os.path.abspath(__file__))
html_files = glob.glob(os.path.join(QUIZ_DIR, '*.html'))

listener_script = """
  <script>
    document.addEventListener('DOMContentLoaded', function() {
       let currentUser = sessionStorage.getItem('mbbs_user') || 'unknown';
       let pathBase = window.location.pathname.split('/').pop().split('.')[0];
       
       function checkTopicCompletion() {
           let allButtons = document.querySelectorAll('button[onclick^="showTest"]');
           if(allButtons.length === 0) return;
           let allCompleted = true;
           allButtons.forEach(btn => {
               let idMatch = btn.getAttribute('onclick').match(/'([^']+)'/);
               if (idMatch) {
                   let id = idMatch[1];
                   let key = 'completed_sub_' + currentUser + '_' + pathBase + '_' + id;
                   if (!localStorage.getItem(key)) {
                       allCompleted = false;
                   }
               }
           });
           
           if (allCompleted) {
               // Post a message to dashboard to mark the whole topic as completed
               // Because we may not easily know the exact item.title, we rely on postMessage handling in dashboard
               window.parent.postMessage({ type: 'topic_completed', urlKey: pathBase }, '*');
           }
       }

       document.querySelectorAll('button[onclick^="showTest"]').forEach(btn => {
           let idMatch = btn.getAttribute('onclick').match(/'([^']+)'/);
           if (idMatch) {
               let id = idMatch[1];
               let key = 'completed_sub_' + currentUser + '_' + pathBase + '_' + id;
               if (localStorage.getItem(key)) {
                   btn.style.backgroundColor = '#10b981';
                   btn.style.color = 'white';
                   btn.style.borderColor = '#059669';
               }
           }
       });
       // checkTopicCompletion(); // Let's only do it when subtopic completes to save processing
    });
    
    window.addEventListener('message', function(e) {
      if (e.data === 'quiz_completed') {
        let currentUser = sessionStorage.getItem('mbbs_user') || 'unknown';
        let pathBase = window.location.pathname.split('/').pop().split('.')[0];
        
        let blockDiv = document.querySelector('.iframe-container[style*="display: block"]');
        if (!blockDiv) blockDiv = document.querySelector('.iframe-container[style*="display:block"]');
        
        if (blockDiv) {
            let id = blockDiv.id;
            let key = 'completed_sub_' + currentUser + '_' + pathBase + '_' + id;
            localStorage.setItem(key, 'true');
            let btn = document.querySelector(`button[onclick="showTest('${id}')"]`);
            if (btn) {
                btn.style.backgroundColor = '#10b981';
                btn.style.color = 'white';
                btn.style.borderColor = '#059669';
            }
            
            // Check if all are completed
            let allButtons = document.querySelectorAll('button[onclick^="showTest"]');
            let allCompleted = true;
            allButtons.forEach(b => {
                let m = b.getAttribute('onclick').match(/'([^']+)'/);
                if(m) {
                    if(!localStorage.getItem('completed_sub_' + currentUser + '_' + pathBase + '_' + m[1])) {
                        allCompleted = false;
                    }
                }
            });
            if(allCompleted) {
                // Determine the exact title of the quiz in mbbsData?
                // The parent doesn't easily know it without string parsing. 
                // Let's pass the URL so the dashboard can find it by link!
                window.parent.postMessage({ type: 'quiz_fully_completed', url_path: pathBase }, '*');
            }
        }
      }
    });
  </script>
"""

affected_files = 0

for file_path in html_files:
    # Skip if it is not a combined test HTML file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if '<button onclick="showTest(' not in content:
        continue
        
    original_content = content
        
    # Check if we already injected the listener
    if 'completed_sub_' not in content:
        content = content.replace('</head>', listener_script + '\n</head>')

    # Inject postMessage into submitTest()
    # Find all instances of "function submitTest() {\n            try {\n" or similar
    # Sometimes it's minimized or slightly different formatting.
    # regex to find function submitTest
    content = re.sub(
        r'(function\s+submitTest\s*\(\)\s*\{[\s\S]*?)(try\s*\{)',
        r'\1\2\n                window.parent.postMessage("quiz_completed", "*");',
        content
    )
    
    # We remove duplicate injections if any
    content = content.replace(
        'window.parent.postMessage("quiz_completed", "*");\n                window.parent.postMessage("quiz_completed", "*");', 
        'window.parent.postMessage("quiz_completed", "*");'
    )
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        affected_files += 1

print(f"Updated {affected_files} quiz HTML files.")
