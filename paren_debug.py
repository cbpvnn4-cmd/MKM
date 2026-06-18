from pathlib import Path
text = Path("frontend/src/pages/ElevatorContractNew.jsx").read_text()
start = text.index("  return (")
end = text.rindex("  );") + 4
sub = text[start:end]

in_s = None
esc = False
count = 0
line = 1
col = 0
for ch in sub:
    col += 1
    if ch == "\n":
        print(f"line {line}: paren balance {count}")
        line += 1
        col = 0
        continue
    if esc:
        esc = False
        continue
    if ch == "\\":
        esc = True
        continue
    if ch in "'\"`":
        if in_s == ch:
            in_s = None
        elif in_s is None:
            in_s = ch
        continue
    if in_s is not None:
        continue
    if ch == '(': count += 1
    elif ch == ')': count -= 1

print(f"final balance {count}")
