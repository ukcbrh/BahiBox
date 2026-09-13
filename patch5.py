import sys

file_path = 'src/components/BranchSettings.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if "longitude: null as number | null" in line and i < 30:
        new_lines.append(line)
        new_lines.append("    upi_id: ''\n")
    else:
        new_lines.append(line)

with open(file_path, 'w') as f:
    f.writelines(new_lines)

print("Success")
