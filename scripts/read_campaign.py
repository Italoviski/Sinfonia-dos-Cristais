with open('js/campaign.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r"id:\s*(\d+),\s*world:\s*(\d+),\s*name:\s*['\"]([^'\"]+)['\"]", text)
print(f"Total levels found: {len(matches)}")
for m in matches:
    print(f"id: {m[0]}, world: {m[1]}, name: {m[2]}")
