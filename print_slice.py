from pathlib import Path
text = Path("frontend/src/pages/ElevatorContractNew.jsx").read_text()
start = text.index('  return (')
end = text.rindex('  );') + 4
sub = text[start:end]
for i,line in enumerate(sub.splitlines(),1):
    if i<=40:
        print(f"{i:3}: {line}")
