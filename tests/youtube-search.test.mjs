import test from "node:test";
import assert from "node:assert/strict";
import {safeVideo,searchWithYtDlp} from "../lib/youtube-search.ts";
test("safe YouTube embeds accept strict video IDs and never trust user-supplied HTML",()=>{
 const video=safeVideo({id:"gDjeEWpyoRA",title:'" onload="evil()',channel:"Science",embedUrl:"https://evil.example/"});
 assert.equal(video.embedUrl,"https://www.youtube.com/embed/gDjeEWpyoRA?rel=0");
 assert.equal(video.watchUrl,"https://www.youtube.com/watch?v=gDjeEWpyoRA");
 assert.equal(safeVideo({id:"javascript:alert(1)",title:"Unsafe"}),null);
 assert.equal(safeVideo({id:"../M7lc1UVf-VE"}),null);
 assert.equal(safeVideo(null),null);
});
test("yt-dlp extractor fails safely if Python is unavailable",async()=>{
 const before=process.env.YTDLP_PYTHON;
 try{process.env.YTDLP_PYTHON="/path/to/missing/python";
  await assert.rejects(()=>searchWithYtDlp("NCERT Class 10 photosynthesis lesson",2));
 }finally{if(before===undefined)delete process.env.YTDLP_PYTHON;else process.env.YTDLP_PYTHON=before}
});
