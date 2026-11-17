import "server-only";
import {readFileSync,statSync} from "node:fs";
import path from "node:path";
export type TextbookSource={id:string;bookId:string;title:string;subject:string;grade:number;chapter:string;page:number;excerpt:string;score:number};
type Chunk={id:string;bookId:string;subject:string;grade:number;chapter:string;page:number;text:string};
type Book={id:string;title:string;subject:string;grade:number;pages:number;indexedChunks:number;ocrPages:number;unreadablePages:number;chapterNames:string[];previewOnly:boolean};
type Index={books:Book[];chunks:Chunk[];notice:string};
let memo:{mtime:number;index:Index;terms:Map<string,number>;tokens:Map<string,string[]>}|undefined;
const stop=new Set(["what","does","from","that","this","with","have","when","your","where","how","why","which","about","please","explain","teach","there","these","those","some","could","would","class","science","chapter","because","make","them","they","into","also","just","will","should","tell","know","like","want"]);
export function terms(s:string){return (s.toLowerCase().replace(/[’']/g,"").match(/[a-z0-9]{3,}/g)||[]).filter(x=>!stop.has(x))}
function load(){
 const file=path.join(process.cwd(),"data","ncert-index.json");
 try{
  const st=statSync(file);
  if(memo&&memo.mtime===st.mtimeMs)return memo;
  const index=JSON.parse(readFileSync(file,"utf8")) as Index;
  const df=new Map<string,number>(),tokens=new Map<string,string[]>();
  for(const c of index.chunks){
   const t=terms(c.text);tokens.set(c.id,t);
   for(const token of new Set(t))df.set(token,(df.get(token)||0)+1);
  }
  memo={mtime:st.mtimeMs,index,terms:df,tokens};
  return memo;
 }catch{return {mtime:0,index:{books:[],chunks:[],notice:"Index unavailable"},terms:new Map<string,number>(),tokens:new Map<string,string[]>()};}
}
export function bookStatus(){const x=load();return {books:x.index.books,chunkCount:x.index.chunks.length};}
export function retrieveTextbook({query,grade=10,subject="Science",chapter,limit=3}:{query:string;grade?:number;subject?:string;chapter?:string;limit?:number}):TextbookSource[]{
 const {index,terms:df,tokens}=load();
 const fullBookIds=new Set(index.books.filter(b=>!b.previewOnly).map(b=>b.id));
 const usable=index.chunks.filter(c=>c.grade===grade&&c.subject===subject&&fullBookIds.has(c.bookId));
 if(!usable.length)return [];
 const qterms=terms(query+" "+(chapter||""));
 if(!qterms.length)return [];
 const unique=[...new Set(qterms)];const docCount=usable.length;
 const scores=usable.map(c=>{
  const words=tokens.get(c.id)||[];const tf=new Map<string,number>();
  for(const w of words)if(unique.includes(w))tf.set(w,(tf.get(w)||0)+1);
  let score=0;
  for(const w of unique){
   const n=tf.get(w)||0;if(!n)continue;
   const rarity=Math.log(1+(docCount+1)/(1+(df.get(w)||1)));
   score+=rarity*(n*2.2)/(n+1.2);
  }
  if(chapter&&c.chapter.toLowerCase()===chapter.toLowerCase())score+=2.2;
  if(query.length>5&&c.text.toLowerCase().includes(query.toLowerCase()))score+=12;
  return {c,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 const result:TextbookSource[]=[];const seenPages=new Set<string>();
 for(const {c,score} of scores){
  const key=c.bookId+"/"+c.page;
  if(seenPages.has(key))continue;
  seenPages.add(key);
  const title=index.books.find(b=>b.id===c.bookId)?.title||c.bookId;
  result.push({id:c.id,bookId:c.bookId,title,subject:c.subject,grade:c.grade,chapter:c.chapter,page:c.page,excerpt:c.text.slice(0,1100),score:Math.round(score*100)/100});
  if(result.length>=limit)break;
 }
 return result;
}
