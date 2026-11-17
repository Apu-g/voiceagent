"use client";
import {useEffect,useState,useRef} from "react";
import {BookOpen,Lightbulb,Compass,CheckCircle2,Video,ExternalLink,RefreshCw} from "lucide-react";
import {makeLaneOverview} from "@/lib/learning-lanes";
import {YoutubeLessonPlayer} from "@/components/youtube-lesson-player";
import {LaneQuiz} from "@/components/lane-quiz";
import {LaneConceptVisual} from "@/components/lane-concept-visual";
type Concept={id:string;chapter:string;title:string;summary:string;essentials:string[];misconception:string;question:string;keywords?:string[];subject?:string;grade?:number};
type VideoOption={id:string;title:string;channel:string;embedUrl:string;watchUrl:string};
type Detail={workedExample?:{problem:string;working:string[];answer:string;check:string}|null;resource?:{url:string;title:string}|null};
type Lane="logic"|"course"|"future";
export function LearningHub({concept,detail,sessionId,onPractice,learningFocus}:{concept:Concept;detail:Detail|null;sessionId:string;onPractice:()=>void;learningFocus?:string}){
 const [lane,setLane]=useState<Lane>("logic"),[completed,setCompleted]=useState<Record<string,boolean>>({}),[saving,setSaving]=useState(false),[progressError,setProgressError]=useState(""),[quizPassed,setQuizPassed]=useState<Record<string,boolean>>({}),[watched,setWatched]=useState<string[]>([]);
 const mutationVersion=useRef(0);
 const [videos,setVideos]=useState<VideoOption[]>([]),[videoStatus,setVideoStatus]=useState("idle"),[searchUrl,setSearchUrl]=useState(""),[activeVideo,setActiveVideo]=useState(""),[videoRetry,setVideoRetry]=useState(0);
 const info=makeLaneOverview({...concept,keywords:concept.keywords||[]});
 useEffect(()=>{if(!sessionId)return;let alive=true;fetch("/api/achievements?sessionId="+encodeURIComponent(sessionId),{cache:"no-store"}).then(r=>r.json()).then(data=>{if(alive)setQuizPassed(Object.fromEntries((data.quizResults||[]).filter((x:{conceptId:string;passed:boolean})=>x.conceptId===concept.id&&x.passed).map((x:{lane:string})=>[x.lane,true]))) }).catch(()=>{});return()=>{alive=false}},[concept.id,sessionId]);
 useEffect(()=>{
  if(!sessionId)return;
  let active=true;const version=mutationVersion.current;
  fetch("/api/lesson-progress?sessionId="+encodeURIComponent(sessionId),{cache:"no-store"}).then(r=>r.json()).then(data=>{
   if(active&&mutationVersion.current===version){const item=(data.items||[]).find((v:{conceptId:string})=>v.conceptId===concept.id);setCompleted(item?.lanes||{});setWatched(item?.videoReviews||[])}
  }).catch(()=>{});
  return()=>{active=false};
 },[concept.id,sessionId]);
 useEffect(()=>{
  let active=true,retryTimer:ReturnType<typeof setTimeout>|undefined;
  const controller=new AbortController();
  const fallbackUrl="https://www.youtube.com/results?"+new URLSearchParams({search_query:concept.title+" science lesson"});
  const endpoint="/api/videos?conceptId="+encodeURIComponent(concept.id)+(learningFocus?"&focus="+encodeURIComponent(learningFocus):"");
  const load=async(attempt:number)=>{
   try{
    const response=await fetch(endpoint,{cache:"no-store",signal:controller.signal});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||"Video search unavailable");
    if(!active)return;
    setVideos(Array.isArray(data.videos)?data.videos:[]);setVideoStatus(data.status||"unavailable");setSearchUrl(data.searchUrl||fallbackUrl);
   }catch{
    if(!active||controller.signal.aborted)return;
    if(attempt<1){retryTimer=setTimeout(()=>load(attempt+1),600);return}
    setVideoStatus("unavailable");setSearchUrl(fallbackUrl);
   }
  };
  queueMicrotask(()=>{if(active){setActiveVideo("");setVideoStatus("loading");setVideos([]);setSearchUrl(fallbackUrl)}});
  void load(0);
  return()=>{active=false;controller.abort();if(retryTimer)clearTimeout(retryTimer)};
 },[concept.id,concept.title,learningFocus,videoRetry]);
 async function markDone(){
  if(!sessionId||saving)return;
  const desired=!completed[lane];mutationVersion.current++;setSaving(true);setProgressError("");
  try{
   const res=await fetch("/api/lesson-progress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId,conceptId:concept.id,lane,completed:desired})});
   if(!res.ok)throw Error("Could not save study progress");
   setCompleted(old=>({...old,[lane]:desired}));
  }catch{setProgressError("Progress could not be saved. Try again.")}finally{setSaving(false)}
 }
 return <section className="journey-card learning-hub" data-testid="learning-hub">
  <div className="section-title"><div><span className="tiny-label">CHOOSE HOW TO LEARN</span><h2>One topic, three ways to discover it</h2></div><span className="soft-pill">{Object.values(completed).filter(Boolean).length}/3 explored · {Object.values(quizPassed).filter(Boolean).length}/3 quizzes passed</span></div>
  <div className="learn-lanes" role="tablist" aria-label="Learning pathways">
   <button role="tab" aria-selected={lane==="logic"} className={lane==="logic"?"selected":""} onClick={()=>setLane("logic")}><Lightbulb size={16}/> Crack the Logic {completed.logic&&<CheckCircle2 size={13}/>}</button>
   <button role="tab" aria-selected={lane==="course"} className={lane==="course"?"selected":""} onClick={()=>setLane("course")}><BookOpen size={16}/> Ace Your Course {completed.course&&<CheckCircle2 size={13}/>}</button>
   <button role="tab" aria-selected={lane==="future"} className={lane==="future"?"selected":""} onClick={()=>setLane("future")}><Compass size={16}/> Beyond the Classroom {completed.future&&<CheckCircle2 size={13}/>}</button>
  </div>
  <div className="lane-content" role="tabpanel">
   {lane==="logic"&&<><h3>Understand what makes it work</h3><p>{concept.summary}</p><b>Think about these building blocks:</b><div className="lane-points">{info.logic.questions.map((q,i)=><p key={i}><span>{i+1}</span>{q}</p>)}</div><p className="lane-question">Check a common mix-up: {concept.misconception}</p></>}
   {lane==="course"&&<><h3>Practice the chapter</h3><p>{concept.question}</p>
     {detail?.workedExample&&<div className="lane-example"><b>{detail.workedExample.problem}</b>{detail.workedExample.working.map((step,i)=><p key={i}>{i+1}. {step}</p>)}<strong>{detail.workedExample.answer}</strong></div>}
     <button className="lane-practice" onClick={onPractice}>Practise with EXO</button>
     {detail?.resource&&<a href={detail.resource.url} target="_blank" rel="noopener noreferrer">Open official NCERT chapter <ExternalLink size={12}/></a>}
    </>}
   {lane==="future"&&<><h3>{info.future.mission.title}</h3><p>{info.future.mission.scenario}</p><div className="future-challenge"><b>Your real-life mission</b><p>{info.future.mission.challenge}</p></div><p><b>Science or maths connection:</b> {info.future.mission.fact}</p>
      <b>Explore some related fields (not career predictions)</b><div className="future-tags">{info.future.mission.fields.map(f=><span key={f}>{f}</span>)}</div>
      <p className="lane-footnote">Explore what interests you. No single chapter score determines what you can become.</p></>}
  </div>
  <LaneConceptVisual concept={{...concept,keywords:concept.keywords||[]}} lane={lane} objective={learningFocus}/>
  <LaneQuiz conceptId={concept.id} lane={lane} sessionId={sessionId} learningFocus={learningFocus} onResult={passed=>setQuizPassed(x=>({...x,[lane]:passed||Boolean(x[lane])}))}/>
  {Object.values(quizPassed).filter(Boolean).length===3&&Object.values(completed).filter(Boolean).length===3&&<p className="lesson-covered" data-testid="topic-covered">Topic covered: all three pathways explored and quizzes passed. This is a practice achievement, not full mastery.</p>}
  {progressError&&<p role="alert" className="room-error">{progressError}</p>}<div className="lane-actions"><button onClick={markDone} disabled={!sessionId||saving}>{completed[lane]?<CheckCircle2 size={15}/>:<CheckCircle2 size={15}/>} {completed[lane]?"Explored — undo":"Mark this path explored"}</button><span>Self-reported progress, not a mastery grade</span></div>
  <div className="video-lesson">
   {learningFocus&&<p className="video-focus">Suggested for your next learning goal: <strong>{learningFocus}</strong></p>}
   <div className="section-title"><div><span className="tiny-label">OPTIONAL VIDEO LESSON</span><h2><Video size={18}/> Watch a topic explanation</h2></div>{videoStatus==="loading"&&<RefreshCw size={15}/>}</div>
   {videoStatus==="loading"?<p>Finding chapter-specific learning videos…</p>:videos.length?<>
     <div className="video-list">{videos.map(v=><button className={activeVideo===v.id?"selected":""} key={v.id} onClick={()=>setActiveVideo(v.id)}><PlayIcon/> <span>{v.title}<small>{v.channel} · YouTube</small></span></button>)}</div>
     {activeVideo&&videos.some(v=>v.id===activeVideo)&&<YoutubeLessonPlayer key={activeVideo} video={videos.find(v=>v.id===activeVideo)!} onTryNext={videos.length>1?()=>{const index=videos.findIndex(v=>v.id===activeVideo);setActiveVideo(videos[(index+1)%videos.length].id)}:undefined}/>}
     <p className="lane-footnote">YouTube videos remain hosted by YouTube. Results are algorithmically found, not teacher-reviewed. Playback is not proof of learning.</p>
    </>:<p>Automatic video discovery is unavailable right now. You can still open YouTube search for this chapter. <button type="button" data-testid="videos-retry" onClick={()=>setVideoRetry(n=>n+1)}>Retry video search</button></p>}
   {activeVideo&&<button className="video-reviewed" onClick={async()=>{
    if(!sessionId)return;
    try{const res=await fetch("/api/lesson-progress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId,conceptId:concept.id,action:"video",videoId:activeVideo})});
      if(!res.ok)throw Error("Save failed");setWatched(old=>old.includes(activeVideo)?old:[...old,activeVideo])}
    catch{setProgressError("Could not save video review.")}
   }} disabled={!sessionId||watched.includes(activeVideo)}>{watched.includes(activeVideo)?"Video marked reviewed":"I watched this video — mark reviewed"}</button>}
   {searchUrl&&<a href={searchUrl} target="_blank" rel="noopener noreferrer">Search this topic on YouTube <ExternalLink size={13}/></a>}
  </div>
 </section>;
}
function PlayIcon(){return <Video size={17}/>}
