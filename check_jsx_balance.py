from pathlib import Path
text = Path('frontend/src/pages/ElevatorContractNew.jsx').read_text()
start = text.index('  return (')
end = text.rindex('  );') + 4
sub = text[start:end]
print('slice length', len(sub))

for name,chars in [('parens','()'),('braces','{}')]:
    opens, closes = chars
    stack = []
    in_s = None
    esc = False
    for i,ch in enumerate(sub):
        if esc:
            esc = False
            continue
        if ch == '\\':
            esc = True
            continue
        if ch in '\'\"`':
            if in_s == ch:
                in_s = None
            elif in_s is None:
                in_s = ch
            continue
        if in_s is not None:
            continue
        if ch == opens:
            stack.append(i)
        elif ch == closes:
            if not stack:
                print(f'unmatched {closes} for {name} at offset', i)
                break
            stack.pop()
    else:
        print(name, 'unmatched opens', len(stack))
        if stack:
            pos = stack[-1]
            line = sub.count('\n', 0, pos) + 1
            col = pos - sub.rfind('\n', 0, pos)
            print(name, 'last unmatched open at line', line, 'col', col)
