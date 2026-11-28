"""Refresh factual CIAAW weight tables after operator review; never runs during a build."""
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import urllib.request


class TableRows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell = [], [], None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        if tag in ("td", "th"):
            self.cell = ""

    def handle_data(self, data):
        if self.cell is not None:
            self.cell += data

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.row.append(self.cell.strip())
            self.cell = None
        if tag == "tr" and self.row:
            self.rows.append(self.row)


def collect():
    result = {"edition": None, "retrieved": datetime.now(timezone(timedelta(hours=2))).date().isoformat(), "sources": {}, "elements": {}}
    for kind, filename in (("abridged", "abridged-atomic-weights.htm"), ("standard", "atomic-weights.htm")):
        url = "https://ciaaw.org/" + filename
        request = urllib.request.Request(url, headers={"User-Agent": "Vela-reference-maintenance/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
        html = raw.decode("utf-8")
        edition = re.search(r"Standard Atomic Weights\s+(20\d{2})", html)
        if not edition:
            raise ValueError("CIAAW edition could not be verified; review the source markup")
        label = "CIAAW " + edition[1]
        if result["edition"] and result["edition"] != label:
            raise ValueError("Full and abridged editions differ; human review required")
        result["edition"] = label
        result["sources"][kind] = {"url": url, "sha256": sha256(raw).hexdigest()}
        parser = TableRows()
        parser.feed(html)
        seen = set()
        for row in parser.rows:
            if len(row) < 4 or not row[0].isdigit() or not re.fullmatch(r"[A-Z][a-z]?", row[1]):
                continue
            z = int(row[0])
            if z in seen or not 1 <= z <= 118:
                raise ValueError("Duplicate or unknown element row")
            seen.add(z)
            value = re.sub(r"\s+", "", row[3])
            entry = result["elements"].setdefault(str(z), {"symbol": row[1]})
            if entry["symbol"] != row[1]:
                raise ValueError("Element symbols disagree between tables")
            if kind == "abridged":
                parts = value.split("±")
                if len(parts) != 2 and value not in ("—", "–", "-"):
                    raise ValueError("Unrecognized weight notation; review required")
                entry.update(abridged=parts[0] if len(parts) == 2 else None, uncertainty=parts[1] if len(parts) == 2 else None)
            else:
                entry["standard"] = None if value in ("—", "–", "-") else value
        if seen != set(range(1, 119)):
            raise ValueError("Expected exactly 118 element records")
    if sum(bool(row["abridged"]) for row in result["elements"].values()) != 84:
        raise ValueError("Standard-weight assignments changed; review before replacing the snapshot")
    return result


if __name__ == "__main__":
    data = collect()
    target = Path(__file__).resolve().parents[1] / "content/references/ciaaw-weights.json"
    temporary = target.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(target)
    print("Verified 118 CIAAW rows and 84 assigned standard weights:", data["edition"])
