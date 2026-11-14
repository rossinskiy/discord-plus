"""Turns a built English page into its Russian twin.

Every text unit of the page (an element that holds text of its own, with its inline markup) is looked up in
the dictionary in i18n_ru.py by its exact inner HTML. Units without an entry stay English and are reported,
so a new sentence on the site never breaks the build and never ships untranslated by accident.
"""

import re

from i18n_ru import RU, norm

VOID = {"meta", "link", "br", "img", "input", "wbr", "hr", "source", "area", "base", "col", "embed", "track"}
SKIP = {"script", "style", "svg", "code", "pre", "kbd", "progress"}
TAG = re.compile(r"<(/?)([A-Za-z][A-Za-z0-9-]*)([^>]*?)(/?)>|<!--.*?-->", re.S)
LETTERS = re.compile(r"[A-Za-z]{2,}")
ATTR = re.compile(r'(\s(?:aria-label|alt|placeholder|data-title|title)=")([^"]*)(")')
META = re.compile(r'(<meta\s+(?:name|property)="(?:description|og:title|og:description|twitter:title|twitter:description)"\s+content=")([^"]*)(")')
INTERNAL = re.compile(r'href="(/(?:plugins|install|privacy|terms|support)?)((?:[?#][^"]*)?)"')


def _elements(html):
    """Yield (name, inner_start, inner_end) for every element, outermost and nested, in document order."""
    stack = []
    out = []
    for m in TAG.finditer(html):
        if m.group(0).startswith("<!--"):
            continue
        closing, name, _attrs, selfclose = m.group(1), m.group(2).lower(), m.group(3), m.group(4)
        if name in VOID or selfclose:
            continue
        if not closing:
            stack.append((name, m.end()))
        else:
            for i in range(len(stack) - 1, -1, -1):
                if stack[i][0] == name:
                    _n, start = stack[i]
                    del stack[i:]
                    out.append((name, start, m.start()))
                    break
    out.sort(key=lambda t: t[1])
    return out


def _has_own_text(inner):
    """True when the inner HTML has a text run outside of every child element."""
    depth = 0
    pos = 0
    for m in TAG.finditer(inner):
        if depth == 0 and LETTERS.search(inner[pos:m.start()]):
            return True
        if not m.group(0).startswith("<!--"):
            name = m.group(2).lower()
            if name not in VOID and not m.group(4):
                depth += -1 if m.group(1) else 1
        pos = m.end()
        depth = max(depth, 0)
    return depth == 0 and bool(LETTERS.search(inner[pos:]))


def units(html):
    """Outermost text units as (start, end, inner) spans."""
    found = []
    covered_until = -1
    skip_until = -1
    for name, start, end in _elements(html):
        if start < max(covered_until, skip_until):
            continue
        if name in SKIP:
            skip_until = end
            continue
        inner = html[start:end]
        if name == "title" or _has_own_text(inner):
            found.append((start, end, inner))
            covered_until = end
    return found


def localize(html, path, missing):
    spans = units(html)
    for start, end, inner in reversed(spans):
        key = norm(inner)
        ru = RU.get(key)
        if ru is None:
            missing.add(key)
            continue
        lead = inner[:len(inner) - len(inner.lstrip())]
        tail = inner[len(inner.rstrip()):]
        html = html[:start] + lead + ru + tail + html[end:]

    def attr(m):
        v = m.group(2)
        if not LETTERS.search(v):
            return m.group(0)
        ru = RU.get(norm(v))
        if ru is None:
            missing.add(norm(v))
            return m.group(0)
        return m.group(1) + ru + m.group(3)

    html = ATTR.sub(attr, html)
    html = META.sub(attr, html)
    html = INTERNAL.sub(lambda m: 'href="/ru' + ("/" if m.group(1) == "/" else m.group(1)) + m.group(2) + '"', html)
    html = html.replace('<html lang="en"', '<html lang="ru"', 1)
    return html
