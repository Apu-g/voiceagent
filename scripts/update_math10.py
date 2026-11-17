#!/usr/bin/env python3
"""Rebuild only the Grade 10 Mathematics index from a new full PDF if present.

Usage: python3 scripts/update_math10.py
Other books are left unchanged to avoid repeating costly Class 10 Science OCR.
"""
import json
import os
from pathlib import Path
from index_ncert import DEST,ROOT,resolve_math10_pdf,process_book

def update():
 if not DEST.exists():
  raise SystemExit("Run python3 scripts/index_ncert.py first (index is missing).")
 existing=json.loads(DEST.read_text(encoding="utf8"))
 pdf_name=resolve_math10_pdf()
 chunks,book=process_book(("maths-10-preview","Mathematics",10,pdf_name))
 if not chunks:
  raise SystemExit(f"Cannot index {pdf_name}: no readable mathematical material.")
 if book["previewOnly"]:
  print(f"NOTICE: {pdf_name} contains only {book['pages']} PDF pages, likely front matter.\n"
        "Original chapter summaries and official NCERT links remain available, but no full textbook was indexed.")
 else:
  print(f"FULL MATHS DOCUMENT: {pdf_name}; indexed {book['indexedChunks']} passages.")
 existing["chunks"]=[x for x in existing["chunks"] if x["bookId"]!="maths-10-preview"]+chunks
 existing["books"]=[book if x["id"]=="maths-10-preview" else x for x in existing["books"]]
 existing["version"]=3
 tmp=DEST.with_suffix(".tmp")
 tmp.write_text(json.dumps(existing,ensure_ascii=False,separators=(",",":")),encoding="utf8")
 os.replace(tmp,DEST)
 (DEST.parent/"book-manifest.json").write_text(json.dumps(existing["books"],ensure_ascii=False,indent=2),encoding="utf8")
 print(f"Index contains {len(existing['chunks'])} passages; Grade 10 Mathematics: {book['indexedChunks']}.")

if __name__=="__main__":update()
