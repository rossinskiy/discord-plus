"""Russian translations of the website, loaded from i18n_ru.tsv (English inner HTML, a tab, Russian inner HTML)."""

import os
import re


def norm(text):
    return re.sub(r"\s+", " ", text.strip())


RU = {}
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "i18n_ru.tsv"), encoding="utf-8") as _f:
    for _line in _f:
        _line = _line.rstrip("\n")
        if not _line or _line.startswith("#") or "\t" not in _line:
            continue
        _en, _ru = _line.split("\t", 1)
        RU[norm(_en)] = _ru
