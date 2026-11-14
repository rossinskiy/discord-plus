import glob
import re
import sys

# Lists candidate UI strings (JSX attributes, quoted option values and JSX text) of the given files.
files = []
for pattern in sys.argv[1:]:
    files += glob.glob(pattern, recursive=True)

QUOTE = chr(34)
attr = re.compile(r"\b(title|label|description|placeholder|text|subtitle|confirmText|cancelText|message)(=|: )\{?" + QUOTE + r"([^" + QUOTE + r"]+)" + QUOTE)
text = re.compile(r">\s*([A-Z][^<>{}]{3,}?)\s*<")

for f in sorted(files):
    with open(f, encoding="utf8") as fh:
        for i, line in enumerate(fh, 1):
            for m in attr.finditer(line):
                if re.search("[A-Za-z]{3}", m.group(3)):
                    print(f"{f}:{i}\tA\t{m.group(3)}")
            for m in text.finditer(line):
                print(f"{f}:{i}\tT\t{m.group(1)}")
