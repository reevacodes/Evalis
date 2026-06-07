import os

filepath = r"c:\Projects\Evalis\frontend\evalis-student-ui\src\pages\StudentResults.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("bg-[#111116]", "bg-slate-950")
content = content.replace("bg-[#17181e]", "bg-slate-900")
content = content.replace("border-[#26272e]", "border-slate-800")
content = content.replace("border-[#3f3f46]", "border-slate-700")
content = content.replace("bg-[#1a1b22]", "bg-slate-800")

# For recharts inline styles
content = content.replace("#111116", "#020617") 
content = content.replace("#26272e", "#1e293b") 

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Color revert complete.")
