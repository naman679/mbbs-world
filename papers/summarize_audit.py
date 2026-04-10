import re

audit_file = "audit_report.txt"
summary = {}

with open(audit_file, 'r', encoding='utf-8') as f:
    for line in f:
        match = re.search(r'File: (.*?) \((\d+) issues\)', line)
        if match:
            filename = match.group(1)
            count = int(match.group(2))
            summary[filename] = count

sorted_summary = sorted(summary.items(), key=lambda x: x[1], reverse=True)
with open("audit_summary_v2.txt", "w", encoding='utf-8') as out:
    for filename, count in sorted_summary:
        out.write(f"{filename}: {count} issues\n")
