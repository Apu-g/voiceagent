#!/usr/bin/env python3
"""Build a local text-only study index from user-provided PDFs.
Never publish original PDFs or the extracted index on a public static route.
Uses pdftotext first; OCR (tesseract) only when extraction is scrambled.
"""
import concurrent.futures
import json
import re
import subprocess
import sys
import time
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/"data"/"ncert-index.json"
BOOKS=[
 ("science-10","Science",10,"NCERT-Class-10-Science.pdf"),
 ("science-9","Science",9,"class 9 science.pdf"),
 ("maths-9","Mathematics",9,"ncert-books-for-class-9-maths.pdf"),
 ("maths-10-preview","Mathematics",10,"maths10th.pdf")
]
CHAPTERS={
 "science-10":["Chemical Reactions and Equations","Acids, Bases and Salts","Metals and Non-metals","Carbon and its Compounds","Life Processes","Control and Coordination","How do Organisms Reproduce?","Heredity","Light – Reflection and Refraction","The Human Eye and the Colourful World","Electricity","Magnetic Effects of Electric Current","Our Environment"],
 "science-9":["Matter in Our Surroundings","Is Matter Around Us Pure?","Atoms and Molecules","Structure of the Atom","The Fundamental Unit of Life","Tissues","Motion","Force and Laws of Motion","Gravitation","Work and Energy","Sound","Improvement in Food Resources"],
 "maths-9":["Number Systems","Polynomials","Coordinate Geometry","Linear Equations in Two Variables","Introduction to Euclid's Geometry","Lines and Angles","Triangles","Quadrilaterals","Circles","Heron's Formula","Surface Areas and Volumes","Statistics"],
 "maths-10-preview":["Real Numbers","Polynomials","Pair of Linear Equations in Two Variables","Quadratic Equations","Arithmetic Progressions","Triangles","Coordinate Geometry","Introduction to Trigonometry","Some Applications of Trigonometry","Circles","Areas Related to Circles","Surface Areas and Volumes","Statistics","Probability"]
}
def run(cmd):
 return subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False).stdout.decode("utf-8","replace")
def ocr(pdf,page):
 ps=subprocess.Popen(["pdftoppm","-f",str(page),"-l",str(page),"-r","125","-singlefile","-gray","-png",str(pdf)],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 result=subprocess.run(["tesseract","stdin","stdout","--psm","3"],stdin=ps.stdout,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 if ps.stdout: ps.stdout.close()
 ps.wait()
 return result.stdout.decode("utf-8","replace")
def extract(pdf):
 raw=run(["pdftotext","-layout",str(pdf),"-"])
 return raw.split("\f")
def clean(text):
 text=re.sub(r"\s+"," ",text)
 text=re.sub(r"(?i)(?:reprint \d{4}-\d{2}|science\s*\d{1,3}\s*$)"," ",text)
 return text.strip()
def good(text):
 sample=text[:3000]
 letters=sum(c.isascii() and c.isalpha() for c in sample)
 chars=sum(not c.isspace() for c in sample)
 return chars>35 and letters/max(chars,1)>.49
def locate_chapter(text,book_id,current):
 header=text[:850].lower()
 # Recognize printed chapter title when it appears near the top of a page
 for name in CHAPTERS[book_id]:
  norm=re.sub(r"[^a-z0-9]+"," ",name.lower()).strip()
  if norm and norm in re.sub(r"[^a-z0-9]+"," ",header):
   return name
 return current
def resolve_math10_pdf():
 candidates=[]
 for p in ROOT.glob("*.pdf"):
  name=p.name.lower().replace(" ","")
  if not any(token in name for token in ("math","ganit")):continue
  if not any(token in name for token in ("10","classx","class-x","tenth")):continue
  metadata=run(["pdfinfo",str(p)])
  match=re.search(r"(?m)^Pages:\\s*(\\d+)",metadata)
  if match:candidates.append((int(match.group(1)),p.name))
 if candidates:
  candidates.sort(key=lambda x:x[0],reverse=True)
  return candidates[0][1]
 return "maths10th.pdf"

def process_book(book):
 book_id,subject,grade,name=book
 pdf=ROOT/name
 if not pdf.exists():return [],{"id":book_id,"error":"file missing"}
 pages=extract(pdf)
 # Skip a trailing empty formfeed. Pdftotext yields 1-based pages.
 page_items=[(i+1,page) for i,page in enumerate(pages) if page.strip()]
 bad=[i for i,txt in page_items if not good(txt)]
 print(f"{name}: {len(page_items)} text pages; {len(bad)} pages require OCR",flush=True)
 ocr_results={}
 if bad:
  with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
   pending={executor.submit(ocr,pdf,i):i for i in bad}
   for n,f in enumerate(concurrent.futures.as_completed(pending),1):
    try:ocr_results[pending[f]]=f.result()
    except Exception:ocr_results[pending[f]]=""
    if n%45==0:print(f"{name}: OCR {n}/{len(bad)}",flush=True)
 chunks=[];chapter="Introduction";low_quality=0
 for i,raw in page_items:
  text=clean(ocr_results.get(i,raw))
  if not good(text):low_quality+=1;continue
  chapter=locate_chapter(text,book_id,chapter)
  words=text.split()
  if len(words)<30:continue
  # Overlapping word windows protect claims split at page positions, keeping page provenance.
  for n,start in enumerate(range(0,len(words),145)):
   excerpt=" ".join(words[start:start+195])
   if len(excerpt)<90:continue
   chunks.append({"id":f"{book_id}-p{i}-{n}","bookId":book_id,"grade":grade,"subject":subject,
                  "chapter":chapter,"page":i,"text":excerpt})
   if start+195>=len(words):break
 meta={"id":book_id,"title":name,"subject":subject,"grade":grade,
       "pages":len(page_items),"indexedChunks":len(chunks),"ocrPages":len(bad),
       "unreadablePages":low_quality,"chapterNames":CHAPTERS[book_id],
       "previewOnly":book_id=="maths-10-preview" and len(page_items)<80}
 return chunks,meta
def main():
 begin=time.perf_counter()
 all_chunks=[];books=[]
 for book in BOOKS:
  if book[0]=="maths-10-preview":book=(book[0],book[1],book[2],resolve_math10_pdf())
  chunks,meta=process_book(book)
  all_chunks.extend(chunks);books.append(meta)
 DEST.parent.mkdir(parents=True,exist_ok=True)
 data={"version":2,"notice":"User-provided local PDFs; private retrieval only. OCR text may contain errors.","books":books,"chunks":all_chunks}
 DEST.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":")),encoding="utf8")
 (DEST.parent/"book-manifest.json").write_text(json.dumps(books,ensure_ascii=False,indent=2),encoding="utf8")
 print(json.dumps({"chunks":len(all_chunks),"books":books,"durationSec":round(time.perf_counter()-begin,1)},indent=2),flush=True)
if __name__=="__main__":main()
