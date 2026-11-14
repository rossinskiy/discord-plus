import re
import sys

# Wraps the English strings that ru.ts knows about in t("...") at the lines printed by i18n_extract.py.
# usage: python scripts/i18n_apply.py candidates.txt
Q = chr(34)
ru_src = open("src/utils/i18n/ru.ts", encoding="utf8").read()
keys = set()
for m in re.finditer(r"^\s*" + Q + r"((?:[^" + Q + r"\\]|\\.)+)" + Q + r":", ru_src, re.M):
    keys.add(m.group(1))

SKIP = {"Settings", "Plugins", "Themes", "Updater", "Cloud", "None", "GitHub", "English", "Russian"}  # handled by hand where needed

edits = {}
for row in open(sys.argv[1], encoding="utf8"):
    loc, kind, text = row.rstrip("\n").split("\t", 2)
    path, line = loc.rsplit(":", 1)
    path = path.replace("\\", "/")
    edits.setdefault(path, []).append((int(line), kind, text))

changed = 0
for path, items in edits.items():
    with open(path, encoding="utf8", newline="") as fh:
        lines = fh.read().split("\n")
    touched = False
    for ln, kind, text in items:
        if text not in keys:
            continue
        s = lines[ln - 1]
        lit = Q + text + Q
        if kind == "A":
            new = s.replace("=" + lit, "={t(" + lit + ")}").replace(": " + lit, ": t(" + lit + ")")
            new = new.replace("={{t(", "={t(")
        else:
            new = s.replace(">" + text + "<", ">{t(" + lit + ")}<")
            if new == s:
                new = re.sub(r">(\s*)" + re.escape(text) + r"(\s*)<", lambda m: ">" + m.group(1) + "{t(" + lit + ")}" + m.group(2) + "<", s)
        if new != s:
            lines[ln - 1] = new
            touched = True
            changed += 1
        else:
            print("UNCHANGED", path, ln, text)
    if touched:
        src = "\n".join(lines)
        if "@utils/i18n" not in src:
            idx = src.index("import ")
            src = src[:idx] + 'import { t } from "@utils/i18n";\n' + src[idx:]
        with open(path, "w", encoding="utf8", newline="") as fh:
            fh.write(src)
print("changed", changed)
