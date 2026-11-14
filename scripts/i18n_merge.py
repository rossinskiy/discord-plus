import sys
Q = chr(34)
path = "src/utils/i18n/ru.ts"
src = open(path, encoding="utf8", newline="").read()
add = ""
n = 0
for row in open(sys.argv[1], encoding="utf8"):
    row = row.rstrip("\n")
    if not row.strip() or "\t" not in row:
        continue
    en, ru = row.split("\t", 1)
    key = Q + en.replace(Q, "\\" + Q) + Q + ":"
    if key in src or key in add:
        continue
    add += "    " + key + " " + Q + ru.replace(Q, "\\" + Q) + Q + ",\n"
    n += 1
body = src.rstrip()
assert body.endswith("};")
body = body[:-2].rstrip("\n") + "\n\n    // Discord+ plugins\n" + add + "};\n"
open(path, "w", encoding="utf8", newline="").write(body)
print("merged", n)
