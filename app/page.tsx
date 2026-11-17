"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {parseSSE} from "@/lib/sse";
import {preferredMaleVoice,clearSpeechSettings} from "@/lib/voice-selection";
import {LearningHub} from "@/components/learning-hub";
import {StudyRoomWidget} from "@/components/study-room-widget";
import {explorerFor} from "@/lib/learning-lanes";
import {RoadmapVisual} from "@/components/roadmap-visual";
import {LearningCurveDashboard} from "@/components/learning-curve-dashboard";
import {StudentDashboard} from "@/components/student-dashboard";
import {ConversationJourney} from "@/components/conversation-journey";
import type {JourneyStep} from "@/lib/conversation-journey";
import {MultilingualSpeech} from "@/components/multilingual-speech";
import type {SpeechLanguage} from "@/lib/speech-budget";
import {ArrowLeft,ArrowRight,AudioLines,BookOpen,BrainCircuit,CheckCircle2,ChevronRight,CircleHelp,Compass,ExternalLink,GraduationCap,Lightbulb,Menu,MessageCircle,Mic,MicOff,TrendingUp,RefreshCw,ShieldCheck,Sparkles,Volume2,VolumeX,X} from "lucide-react";
type Concept={id:string;chapter:string;title:string;summary:string;essentials:string[];misconception:string;question:string;keywords?:string[];grade?:number;subject?:string;previewOnly?:boolean};
type Source={kind:string;title:string;chapter:string;id:string;page?:number;bookId?:string};
type Book={id:string;title:string;grade:number;subject:string;indexedChunks:number;previewOnly:boolean;pages:number};
type LessonDetail={concept:Concept;sourceStatus:string;citations:Array<{title:string;page:number;excerpt:string;chapter:string}>;workedExample?:{problem:string;working:string[];answer:string;check:string}|null;prerequisites?:string[];resource?:{url:string;title:string;note:string}|null;warning?:string};
type Visual={title:string;caption:string;nodes:Array<{label:string;detail:string}>;links:string[];source:string};
type Turn={role:"student"|"exo";text:string};
type Message=Turn&{id:number;provider?:string;conceptId?:string};
type Evidence={objective:string;status:"correct"|"misconception"|"unverified";quote?:string;note:string;source:string};
type Analysis={conceptId:string;conceptTitle:string;evidence:Evidence[];confidence:string;recommendation:string;rationale:string;studentTurns:number;analysisMethod:string;needsReview:boolean};
type Lesson={id:string;conceptId:string;title:string;chapter:string;description:string;objective:string;status:"start"|"next"|"later";minutes:number;activity:string};
type Roadmap={analysis:Analysis;lessons:Lesson[];generatedAt:string;reviewProvider:string;analysisTimeMs:number;journey?:JourneyStep[];topicDetection?:{conceptId:string;confidence:string;reason:string;relevantTurns:string[];questions:string[]}};
type RecognitionEvent={resultIndex:number;results:ArrayLike<ArrayLike<{transcript:string}>&{isFinal:boolean}>};
type Recognition={lang:string;continuous:boolean;interimResults:boolean;onresult:((event:RecognitionEvent)=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void};
declare global {interface Window {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition}}
const greeting="Hi, I'm EXO. Before we start, do you have a science question, or would you like to tell me what you already know? We can take it at your pace.";
export default function Home(){
 const [catalog,setCatalog]=useState<Concept[]>([]),[books,setBooks]=useState<Book[]>([]),[grade,setGrade]=useState(10),[subject,setSubject]=useState("Science"),[chapter,setChapter]=useState("Life Processes"),[conceptId,setConceptId]=useState("photosynthesis"),[mode,setMode]=useState<"learn"|"quiz">("learn");
 const [view,setView]=useState<"conversation"|"roadmap"|"lesson"|"dashboard">("conversation"),[roadmap,setRoadmap]=useState<Roadmap|null>(null),[lessonId,setLessonId]=useState(""),[analysisBusy,setAnalysisBusy]=useState(false);
 const [lessonDetail,setLessonDetail]=useState<LessonDetail|null>(null),[visual,setVisual]=useState<Visual|null>(null),[visualLoading,setVisualLoading]=useState(false),[lessonLoading,setLessonLoading]=useState(false);
 const [messages,setMessages]=useState<Message[]>([{id:0,role:"exo",text:greeting}]);
 const [draft,setDraft]=useState(""),[busy,setBusy]=useState(false),[listening,setListening]=useState(false),[speaking,setSpeaking]=useState(false),[sound,setSound]=useState(true),[handsFree,setHandsFree]=useState(false),[voiceActive,setVoiceActive]=useState(false),[sessionEnded,setSessionEnded]=useState(false);
 const [error,setError]=useState(""),[status,setStatus]=useState("Checking services"),[sidebar,setSidebar]=useState(false),[sessionId,setSessionId]=useState(""),[sources,setSources]=useState<Source[]>([]);
 const [languageCode,setLanguageCode]=useState<SpeechLanguage>("en-IN"),[achievement,setAchievement]=useState<{covered:number;points:number;topics:Array<{conceptId:string;covered:boolean;quizCount:number;reviewedCount:number}>}>({covered:0,points:0,topics:[]});
 const rec=useRef<Recognition|null>(null),history=useRef(messages),scroll=useRef<HTMLDivElement>(null),shouldAutoSend=useRef(false),finalTranscript=useRef(""),sendRef=useRef<(v:string)=>void>(()=>{}),listenRef=useRef<()=>void>(()=>{});
 const voiceRef=useRef(false),busyRef=useRef(false),ttsQueue=useRef<string[]>([]),ttsPlaying=useRef(false),responseComplete=useRef(true),generationRef=useRef(0),abortChat=useRef<AbortController|null>(null),recognitionRetries=useRef(0);
 useEffect(()=>{history.current=messages;scroll.current?.scrollIntoView({behavior:"smooth",block:"end"});},[messages,busy]);
 useEffect(()=>{
  let sid=sessionStorage.getItem("exo-session");if(!sid){sid=crypto.randomUUID();sessionStorage.setItem("exo-session",sid)}
  queueMicrotask(()=>setSessionId(sid!));
  // Request installed browser voices early; some engines load them lazily.
  window.speechSynthesis?.getVoices();
  fetch("/api/catalog").then(r=>r.json()).then(d=>{setCatalog(d.concepts||[]);setBooks(d.books||[])}).catch(()=>setError("Could not load the curriculum"));
  fetch("/api/health").then(r=>r.json()).then(d=>setStatus(d.mongodb==="connected"?"Learning session connected":"Practice session")).catch(()=>setStatus("Offline practice"));
  return ()=>{voiceRef.current=false;window.speechSynthesis?.cancel();abortChat.current?.abort();rec.current?.stop()};
 },[]);
 const filtered=useMemo(()=>catalog.filter(c=>(c.grade??10)===grade&&(c.subject??"Science")===subject),[catalog,grade,subject]);
 const chapters=useMemo(()=>[...new Set(filtered.map(c=>c.chapter))],[filtered]);
 const selected=catalog.find(c=>c.id===conceptId);
 const related=filtered.filter(c=>c.chapter===chapter&&c.id!==conceptId);
 const studentMessages=messages.filter(m=>m.role==="student"&&(!m.conceptId||m.conceptId===conceptId));
 const lesson=lessonDetail?.concept||catalog.find(c=>c.id===lessonId);
 const selectedBook=books.find(b=>b.grade===grade&&b.subject===subject);
 function cancelSpeech(){
  generationRef.current++;ttsQueue.current=[];ttsPlaying.current=false;setSpeaking(false);
  if(typeof window!=="undefined")window.speechSynthesis?.cancel();
 }
 function stopRecognizer(){
  const r=rec.current;rec.current=null;
  if(r){r.onend=null;r.onerror=null;try{r.stop()}catch{/* device already stopped */}}
  setListening(false);
 }
 function nextSpeech(){
  if(ttsPlaying.current)return;
  const phrase=ttsQueue.current.shift();
  if(!phrase){
   setSpeaking(false);
   if(voiceRef.current&&responseComplete.current&&!busyRef.current)listenRef.current();
   return;
  }
  if(!("speechSynthesis" in window)){nextSpeech();return}
  const gen=generationRef.current,u=new SpeechSynthesisUtterance(phrase.replace(/[#*]/g,""));
  u.lang=languageCode;
  const male=preferredMaleVoice(window.speechSynthesis.getVoices(),languageCode);
  if(male)u.voice=male;
  Object.assign(u,clearSpeechSettings());ttsPlaying.current=true;
  u.onstart=()=>{if(gen===generationRef.current)setSpeaking(true)};
  const done=()=>{if(gen!==generationRef.current)return;ttsPlaying.current=false;nextSpeech()};
  u.onend=done;u.onerror=done;
  window.speechSynthesis.speak(u);
 }
 function queueSpeech(phrase:string){
  if(!phrase.trim()||(!sound&&!voiceRef.current))return;
  if(!sound&&voiceRef.current){if(responseComplete.current&&!busyRef.current)listenRef.current();return}
  ttsQueue.current.push(phrase.trim());
  nextSpeech();
 }
 function stopVoice(announced=false){
  voiceRef.current=false;setVoiceActive(false);setSessionEnded(true);stopRecognizer();
  abortChat.current?.abort();busyRef.current=false;setBusy(false);cancelSpeech();
  const farewell="That's a good point to finish for now. Press Let's learn and I'll show you a learning path based on what you explained.";
  if(announced){setMessages(m=>[...m,{id:Date.now(),role:"exo",text:farewell}]);queueSpeech(farewell)}
 }
 function changeTopic(c:Concept){
  if(voiceRef.current)stopVoice();
  cancelSpeech();setGrade(c.grade??10);setSubject(c.subject??"Science");setChapter(c.chapter);setConceptId(c.id);setView("conversation");setSidebar(false);setSources([]);setSessionEnded(false);
  setMessages([{id:Date.now(),role:"exo",text:"Let's explore "+c.title.toLowerCase()+". Do you want to ask something, or explain what you already know?"}]);
 }
 function choose(c:Concept){changeTopic(c)}
 function changeShelf(g:number,s:string){
  setGrade(g);setSubject(s);const next=catalog.find(c=>(c.grade??10)===g&&(c.subject??"Science")===s);
  if(next)changeTopic(next);
 }
 function startListening(){
  if(rec.current||busyRef.current||ttsPlaying.current||typeof window==="undefined")return;
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){setError("Browser speech recognition is unavailable. Use Chrome/Edge or type your question.");voiceRef.current=false;setVoiceActive(false);return}
  const r=new Speech();rec.current=r;finalTranscript.current="";
  r.lang=languageCode;r.continuous=false;r.interimResults=true;
  r.onresult=e=>{
   let words="";let allFinal=true;
   for(let i=0;i<e.results.length;i++){words+=e.results[i][0].transcript+" ";if(!e.results[i].isFinal)allFinal=false}
   setDraft(words.trim());
   if(allFinal)finalTranscript.current=words.trim();
  };
  r.onerror=e=>{
   if(e.error==="not-allowed"||e.error==="service-not-allowed"){voiceRef.current=false;setVoiceActive(false);setError("Microphone permission was denied. Allow microphone access to use voice mode.")}
   else if(!["no-speech","aborted"].includes(e.error))setError("Speech recognition: "+e.error);
  };
  r.onend=()=>{
   if(rec.current!==r)return;
   rec.current=null;setListening(false);
   const last=finalTranscript.current.trim();finalTranscript.current="";
   if(last&&/^(stop speaking|stop talking|end (the )?conversation|end (the )?session|goodbye exo|that's all)[.! ]*$/i.test(last)){stopVoice(true);return}
   if(last&&(shouldAutoSend.current||voiceRef.current)){
    recognitionRetries.current=0;sendRef.current(last);return;
   }
   if(voiceRef.current){
    if(recognitionRetries.current<3){recognitionRetries.current++;setTimeout(()=>{if(voiceRef.current)listenRef.current()},450)}
    else setError("I couldn't hear an answer. Tap the microphone or restart the voice conversation.");
   }
   shouldAutoSend.current=false;
  };
  try{r.start();setListening(true)}catch{rec.current=null;setError("Could not start microphone capture");setListening(false)}
 }
 function mic(){
  if(listening){stopRecognizer();return}
  if(ttsPlaying.current){cancelSpeech();responseComplete.current=true}
  if(busyRef.current){abortChat.current?.abort();busyRef.current=false;setBusy(false)}
  recognitionRetries.current=0;
  shouldAutoSend.current=handsFree||voiceRef.current;
  startListening();
 }
 function startVoice(){
  if(voiceRef.current){stopVoice();return}
  cancelSpeech();voiceRef.current=true;setVoiceActive(true);setSessionEnded(false);setError("");recognitionRetries.current=0;
  responseComplete.current=true;
  if(sound)queueSpeech("Hi! I'm EXO. Do you have a question, or would you like to tell me something you already know? I'm listening.");
  else startListening();
 }
 async function send(value?:string){
  const message=(value??draft).trim();if(!message||busyRef.current)return;
  if(/^(stop speaking|stop talking|end (the )?conversation|end (the )?session|goodbye exo|that's all)[.! ]*$/i.test(message)){stopVoice(true);setDraft("");return}
  stopRecognizer();cancelSpeech();setDraft("");setError("");setSessionEnded(false);busyRef.current=true;setBusy(true);responseComplete.current=false;
  const previous:Turn[]=history.current.slice(-16).map(m=>({role:m.role,text:m.text}));
  const studentId=Date.now(),exoId=studentId+1,controller=new AbortController();abortChat.current=controller;
  setMessages(m=>[...m,{id:studentId,role:"student",text:message,conceptId},{id:exoId,role:"exo",text:""}]);
  let answer="",speechBuffer="",streamProvider="groq",lastRender=0,left="";
  const speakSentence=(fragment:string)=>{
   if(!voiceRef.current)return;
   speechBuffer+=fragment;
   while(speechBuffer.length>25){
    const match=/^([\s\S]*?[.!?])(?:\s+|$)/.exec(speechBuffer);
    if(!match||match[1].length<24)break;
    const sentence=match[1].trim();
    speechBuffer=speechBuffer.slice(match[0].length);
    queueSpeech(sentence);
   }
   if(speechBuffer.length>230&&!/[.!?]/.test(speechBuffer)){
    const cut=speechBuffer.lastIndexOf(" ",160);
    if(cut>50){queueSpeech(speechBuffer.slice(0,cut));speechBuffer=speechBuffer.slice(cut+1)}
   }
  };
  try{
   const resp=await fetch("/api/chat/stream",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,chapter,conceptId,mode,history:previous,sessionId,languageCode}),signal:controller.signal});
   if(!resp.ok||!resp.body)throw Error("The tutor couldn't begin streaming.");
   const reader=resp.body.getReader(),decoder=new TextDecoder();
   let ended=false;
   while(!ended){
    const {done,value}=await reader.read();if(done)break;
    left=parseSSE(left+decoder.decode(value,{stream:true}),({event,data})=>{
     if(controller.signal.aborted||typeof data!=="object"||!data)return;
     const d=data as {text?:string;provider?:string;concept?:Concept;sources?:Source[];message?:string};
     if(event==="token"&&typeof d.text==="string"){
      answer+=d.text;
      if(Date.now()-lastRender>50){const snapshot=answer;setMessages(m=>m.map(x=>x.id===exoId?{...x,text:snapshot}:x));lastRender=Date.now()}
      speakSentence(d.text);
     }
     if(event==="metadata"&&Array.isArray(d.sources))setSources(d.sources);
     if(event==="done"){
      ended=true;streamProvider=d.provider||streamProvider;
      if(d.concept&&d.concept.id!==conceptId){setMessages(m=>m.map(x=>x.id===studentId?{...x,conceptId:d.concept!.id}:x));setConceptId(d.concept.id);setChapter(d.concept.chapter);setGrade(d.concept.grade??10);setSubject(d.concept.subject??"Science")}
      if(Array.isArray(d.sources))setSources(d.sources);
     }
     if(event==="warning")setStatus(d.message||"Using curated learning notes");
    });
   }
   setMessages(m=>m.map(x=>x.id===exoId?{...x,text:answer||"I'm here. Could you say that again?",provider:streamProvider}:x));
   if(voiceRef.current){
    if(speechBuffer.trim())queueSpeech(speechBuffer);
   }else if(sound&&answer.trim())queueSpeech(answer);
  }catch(e){
   if(!controller.signal.aborted){
    const messageText=answer||"The connection was interrupted. Could you repeat your question?";
    setMessages(m=>m.map(x=>x.id===exoId?{...x,text:messageText,provider:"offline"}:x));
    setError(e instanceof Error?e.message:"Speech connection interrupted");
    if(voiceRef.current)queueSpeech(messageText);
   }
  }finally{
   if(abortChat.current===controller)abortChat.current=null;
   responseComplete.current=true;busyRef.current=false;setBusy(false);
   if(voiceRef.current&&!ttsPlaying.current&&!ttsQueue.current.length)listenRef.current();
  }
 }
 useEffect(()=>{sendRef.current=send;listenRef.current=startListening;});
 async function createLearningPath(){
  if(busyRef.current||analysisBusy)return;
  cancelSpeech();stopRecognizer();voiceRef.current=false;setVoiceActive(false);setError("");setAnalysisBusy(true);
  try{
   const turns=history.current.filter(m=>m.role==="student").slice(-24).map(m=>m.text);
   const resp=await fetch("/api/roadmap",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({conceptId,turns,sessionId})});
   const d=await resp.json();if(!resp.ok)throw Error(d.error||"Unable to create roadmap");
   setRoadmap(d);if(d.analysis?.conceptId&&d.analysis.conceptId!==conceptId){const detected=catalog.find(c=>c.id===d.analysis.conceptId);if(detected){setConceptId(detected.id);setChapter(detected.chapter);setSubject(detected.subject??"Science");setGrade(detected.grade??10)}}setView("roadmap");
  }catch(e){setError(e instanceof Error?e.message:"Could not build a learning path")}finally{setAnalysisBusy(false)}
 }
 async function openLesson(id:string){
  stopRecognizer();cancelSpeech();voiceRef.current=false;setVoiceActive(false);
  setLessonId(id);setView("lesson");setSidebar(false);setVisual(null);setVisualLoading(true);setLessonLoading(true);setLessonDetail(null);
  const [lessonResult,visualResult]=await Promise.allSettled([
   fetch("/api/lesson?conceptId="+encodeURIComponent(id)).then(r=>{if(!r.ok)throw Error("Lesson unavailable");return r.json()}),
   fetch("/api/visual?conceptId="+encodeURIComponent(id)).then(r=>{if(!r.ok)throw Error("Visual unavailable");return r.json()})
  ]);
  if(lessonResult.status==="fulfilled")setLessonDetail(lessonResult.value);else setError("Could not load the textbook lesson");
  if(visualResult.status==="fulfilled")setVisual(visualResult.value);
  setVisualLoading(false);setLessonLoading(false);
 }
 function practiceConcept(id:string){
  const c=catalog.find(x=>x.id===id);
  if(!c)return;
  cancelSpeech();setConceptId(c.id);setGrade(c.grade??10);setSubject(c.subject??"Science");setChapter(c.chapter);setMode("quiz");setView("conversation");setSidebar(false);
  setMessages([{id:Date.now(),role:"exo",text:"Let's practice "+c.title.toLowerCase()+". "+c.question}]);
  setSessionEnded(false);
 }
 const steps=roadmap?.lessons||[];
 useEffect(()=>{if(!sessionId)return;let alive=true;fetch("/api/achievements?sessionId="+encodeURIComponent(sessionId),{cache:"no-store"}).then(r=>r.json()).then(j=>{if(alive)setAchievement({covered:j.covered||0,points:j.points||0,topics:j.topics||[]})}).catch(()=>{});return()=>{alive=false}},[sessionId,view]);
 return <div className="shell">
 <aside className={"sidebar "+(sidebar?"open":"")}><div className="logo"><div className="logo-icon"><BrainCircuit size={22}/></div><div><strong>explaino<span>.</span></strong><small>YOUR LEARNING SPACE</small></div><button className="close" onClick={()=>setSidebar(false)} aria-label="Close menu"><X size={18}/></button></div>
 <div className="side-scroll"><div className="eyebrow">YOUR WORKSPACE</div><button className={"nav nav-btn "+(view==="conversation"?"active":"")} onClick={()=>{setView("conversation");setSidebar(false)}}><MessageCircle size={17}/> Mentor conversation</button><button className={"nav nav-btn "+(view==="dashboard"?"active":"")} onClick={()=>{setView("dashboard");setSidebar(false)}}><TrendingUp size={17}/> My progress dashboard</button><button className={"nav nav-btn "+(view==="roadmap"||view==="lesson"?"active":"")} onClick={()=>{if(roadmap)setView("roadmap");else createLearningPath();setSidebar(false)}}><Compass size={17}/> My learning path</button><div className="line"/><div className="eyebrow">CHOOSE YOUR TEXTBOOK</div>
 <div className="shelf-control"><div className="shelf-tabs">{[9,10].map(g=><button key={g} className={grade===g?"selected":""} onClick={()=>changeShelf(g,subject)}>Class {g}</button>)}</div><div className="shelf-tabs">{["Science","Mathematics"].map(sub=><button key={sub} className={subject===sub?"selected":""} onClick={()=>changeShelf(grade,sub)}>{sub}</button>)}</div></div>
 <div className="subject"><BookOpen size={18}/><div><b>NCERT {subject} · Class {grade}</b><small>{filtered.length} topics · {selectedBook?.indexedChunks||0} indexed passages</small>{selectedBook?.previewOnly&&<small>Contents preview only</small>}</div></div>
 {chapters.map((ch,i)=><div key={ch}><button className={"chapter "+(chapter===ch?"chosen":"")} onClick={()=>{const c=filtered.find(x=>x.chapter===ch);if(c)choose(c)}}><span>{String(i+1).padStart(2,"0")}</span>{ch}<ChevronRight size={14}/></button>{filtered.filter(x=>x.chapter===ch).map(c=><button key={c.id} className={"topic "+(c.id===conceptId?"picked":"")} onClick={()=>choose(c)}><span className="dot"/>{c.title}{achievement.topics.some(t=>t.conceptId===c.id&&t.covered)&&<CheckCircle2 size={14} aria-label="Topic covered"/>}</button>)}</div>)}
 </div><div className="sidebar-foot"><div className="achievements-pulse" data-testid="achievement-summary"><b>{achievement.covered} topics covered</b><span>{achievement.points} quiz points earned</span></div><span className="online"/>{status}<div className="user"><span>S</span><div><b>Student workspace</b><small>Personal study prototype</small></div></div></div></aside>
 <main><header className="top"><div><button className="mobile-menu" onClick={()=>setSidebar(true)} aria-label="Open menu"><Menu size={20}/></button>Workspace <ChevronRight size={14}/><b>{view==="conversation"?"Mentor session":view==="dashboard"?"My learning dashboard":view==="roadmap"?"My learning roadmap":"Learning studio"}</b></div><span className="beta">✦ EXO LAB · CLASS {grade}</span></header>
 {view==="conversation"?<div className="layout"><section className="conversation">
 <div className="hero"><div className="eyebrow">YOUR PERSONAL {subject.toUpperCase()} MENTOR</div><h1>Think aloud. <span>Grow smarter.</span></h1><p>No pressure to get it perfect. Explain what you know, and we'll work from there.</p></div>
 <div className="orb-space"><div className={"orb-shell "+(listening?"listening":speaking?"speaking":busy?"thinking":"")}><div className="orb"/></div><div className="orb-caption"><span className="online"/>{listening?"Listening to you":speaking?"EXO is speaking sentence by sentence":busy?"EXO is forming an answer":voiceActive?"Ready for your next answer":"EXO is here to listen"}</div>
 <div className="voice-actions"><button className={"voice-main "+(voiceActive?"is-active":"")} onClick={voiceActive?()=>stopVoice():startVoice} aria-label={voiceActive?"Stop Speaking":"Start Speaking"}>{voiceActive?<MicOff size={16}/>:<Mic size={16}/>} {voiceActive?"Stop Speaking":"Start Speaking"}</button>{voiceActive&&<button className="voice-interrupt" onClick={mic} aria-label="Interrupt EXO and speak">Interrupt & talk</button>}</div></div>
 <div className="messages"><div className="day">MENTOR CONVERSATION</div>{messages.filter(m=>m.text).map(m=><div className={"message "+(m.role==="student"?"from-student":"")} key={m.id}><div className={"avatar "+(m.role==="exo"?"exo":"student")}>{m.role==="exo"?<Sparkles size={15}/>:"S"}</div><div><div className="msg-name">{m.role==="exo"?"EXO":"You"}</div><div className="bubble">{m.text}</div>{m.provider&&<div className="provider">Response · {m.provider==="offline-study-notes"?"offline learning notes":m.provider}</div>}</div></div>)}{busy&&<div className="message"><div className="avatar exo"><Sparkles size={15}/></div><div className="bubble">Considering what to ask next…</div></div>}<div ref={scroll}/></div>
 {messages.length<3&&<div className="suggestions">{["I have a question","Let me explain photosynthesis","Give me a quick science check"].map(s=><button key={s} onClick={()=>send(s)}>{s}<ArrowRight size={13}/></button>)}</div>}
 <div className="mentor-journey-bar"><div><span className="tiny-label">NEXT STEP</span><b>{sessionEnded?"Conversation complete — your next steps are ready":studentMessages.length>=2?"Ready for a tailored path":"Talk with EXO, then learn"}</b><small>{sessionEnded?"Press Let’s learn to review evidence and choose a lesson.":studentMessages.length<2?"Answer a couple of questions to improve your recommendations.":"Review what you demonstrated and continue learning."}</small></div><button onClick={createLearningPath} disabled={busy||analysisBusy}><Compass size={16}/>{analysisBusy?"Analyzing…":"Let's learn"}<ArrowRight size={15}/></button></div>
 <MultilingualSpeech sessionId={sessionId} language={languageCode} onLanguage={setLanguageCode} onTranscribed={text=>sendRef.current(text)} lastReply={[...messages].reverse().find(m=>m.role==="exo"&&m.text)?.text||""}/>
 <div className="compose">{error&&<div className="error">{error}<button onClick={()=>setError("")}><X size={14}/></button></div>}<div className={"entry "+(listening?"recording":"")}><button className={"mic "+(listening?"live":"")} onClick={mic} aria-label={listening?"Stop microphone":"Start microphone"}>{listening?<MicOff size={20}/>:<Mic size={20}/>}</button><input value={draft} disabled={busy} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder={listening?"Listening…": "Ask a question or explain an idea…"} aria-label="Message to EXO"/><button className="sound" aria-label="Toggle speech" onClick={()=>{setSound(v=>!v);cancelSpeech()}}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button><button className="send" onClick={()=>send()} disabled={!draft.trim()||busy} aria-label="Send"><ArrowRight size={20}/></button></div><div className="compose-note"><label className="auto-voice"><input type="checkbox" checked={handsFree} onChange={e=>setHandsFree(e.target.checked)}/> Auto-send when I finish speaking</label><span><ShieldCheck size={13}/> Browser microphone</span></div></div>
 </section><aside className="insights"><div className="insights-title"><Lightbulb size={19}/><b>Session compass</b><span>● LIVE</span></div><div className="insights-content"><div className="panel"><div className="eyebrow">CURRENT FOCUS</div><div className="focus"><div className="focus-icon"><BookOpen size={23}/></div><div><small>{subject.toUpperCase()} · CLASS {grade}</small><h3>{selected?.title||"Photosynthesis"}</h3><p>{selected?.chapter||"Life Processes"}</p></div></div><div className="toggle"><button className={mode==="learn"?"selected":""} onClick={()=>setMode("learn")}>Mentor mode</button><button className={mode==="quiz"?"selected":""} onClick={()=>setMode("quiz")}>Quiz mode</button></div></div><div className="panel"><div className="eyebrow">WE'RE EXPLORING</div>{selected?.essentials.map(x=><div className="check" key={x}><span><CircleHelp size={12}/></span>{x}</div>)}</div><div className="panel"><div className="eyebrow">HOW THIS WORKS</div><div className="next"><BrainCircuit size={20}/><div><b>Explain → Reflect → Learn</b><p>We listen first, check your actual claims, then suggest lessons. Silence is never treated as a mistake.</p><small>No automatic grades are assigned</small></div></div></div><div className="panel"><div className="eyebrow">OTHER TOPICS TO EXPLORE</div>{related.slice(0,3).map(c=><button className="related" key={c.id} onClick={()=>choose(c)}><BookOpen size={15}/>{c.title}<ChevronRight size={14}/></button>)}</div><div className="panel"><div className="eyebrow">SOURCE CONTENT</div><p className="resource-small">Original teaching notes (cached) + retrieved passages from your uploaded PDFs. OCR citations are provisional.</p>{sources.filter(x=>x.kind==="textbook").length>0&&<div className="source-list">{sources.filter(x=>x.kind==="textbook").map(x=><div key={x.id} className="source-cite"><BookOpen size={13}/><span>{x.title} · PDF page {x.page}</span></div>)}</div>}<a href="https://ncert.nic.in/textbook.php" target="_blank" rel="noopener noreferrer">Visit NCERT books <ExternalLink size={14}/></a></div></div></aside></div>:
 <div className="journey-page">
 <div className="journey-heading"><button className="back-link" onClick={()=>setView(view==="lesson"?"roadmap":"conversation")}><ArrowLeft size={17}/>{view==="lesson"?"Back to roadmap":"Back to conversation"}</button><span className="journey-tag"><Sparkles size={13}/> PERSONALIZED {subject.toUpperCase()} STUDIO</span></div>
 {view==="dashboard"&&<StudentDashboard sessionId={sessionId} roadmap={roadmap} onTalk={()=>setView("conversation")} onRoadmap={()=>{if(roadmap)setView("roadmap");else createLearningPath()}} onLesson={openLesson}/>}
 {view==="roadmap"&&roadmap?<><div className="journey-intro"><div><div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h1>{roadmap.analysis.studentTurns?<>A path built around <em>your understanding.</em></>:<>A starting path for <em>your questions.</em></>}</h1><p>{roadmap.analysis.studentTurns?"We separated demonstrated ideas from concepts still needing verification.":"There are no assessed explanations yet. These lessons are suggestions, not a knowledge score."} Choose any lesson to get started.</p></div><button className="recheck" onClick={createLearningPath} disabled={analysisBusy}><RefreshCw size={16}/>{analysisBusy?"Analyzing":"Re-check answers"}</button></div>
 <div className="overview-stats"><div><b>{roadmap.lessons.length}</b><span>Guided lessons</span></div><div><b>{roadmap.analysis.evidence.filter(e=>e.status==="correct").length}</b><span>Ideas mentioned</span></div><div><b>{roadmap.analysis.evidence.filter(e=>e.status==="misconception").length}</b><span>Possible misconceptions</span></div><div><b>{roadmap.analysis.confidence}</b><span>Evidence confidence</span></div></div>
 <section className="journey-card roadmap-analysis" data-testid="roadmap-analysis">
 <div className="section-title"><div><span className="tiny-label">FIRST · CONVERSATION ANALYSIS</span><h2>What EXO could actually learn from this chat</h2></div><span className="soft-pill">{roadmap.analysis.confidence} evidence confidence</span></div>
 <p className="analysis-focus"><b>Current topic:</b> {roadmap.analysis.conceptTitle}</p>
 <p className="analysis-focus-reason">{roadmap.topicDetection?.reason||"Based on the topic selected for learning."}</p>
 <div className="analysis-observations">
 <div><b>{roadmap.topicDetection?.relevantTurns?.length??roadmap.analysis.studentTurns}</b><span>Relevant student turns</span></div>
 <div><b>{roadmap.analysis.studentTurns}</b><span>Explanation turns assessed</span></div>
 <div><b>{roadmap.analysis.evidence.filter(e=>e.status==="correct").length}</b><span>Supported ideas</span></div>
 <div><b>{roadmap.analysis.evidence.filter(e=>e.status==="misconception").length}</b><span>Ideas to revisit</span></div>
 </div>
 {roadmap.analysis.studentTurns===0?<p className="analysis-no-evidence" role="status">You asked questions but have not yet explained this topic in your own words. This is a starter roadmap, not a mastery judgement. Try answering one lesson question to make the next review more personalized.</p>:<p className="analysis-no-evidence">EXO found {roadmap.analysis.studentTurns} explanation turn(s) to check. Supported ideas are provisional; anything not mentioned remains unverified.</p>}
 {roadmap.analysis.evidence.find(e=>e.quote)&&<blockquote className="analysis-student-quote"><b>From your own explanation:</b> “{roadmap.analysis.evidence.find(e=>e.quote)?.quote}”</blockquote>}
 <p className="analysis-summary-next"><b>Recommended next:</b> {roadmap.analysis.rationale}</p>
 </section>
 <section className="journey-card"><div className="section-title"><div><span className="tiny-label">01 / PERSONAL ROADMAP</span><h2>Your next learning steps</h2></div><span className="soft-pill"><Compass size={15}/>{roadmap.analysis.studentTurns?"Adapted to your explanations":"Starter recommendations — not yet assessed"}</span></div>
 <div className="roadmap-track">{steps.map((s,i)=><div className="roadmap-step" key={s.id}><div className="step-top"><span className={"step-number "+(i===0?"current":"")}>{String(i+1).padStart(2,"0")}</span>{i<steps.length-1&&<span className="step-connector"/>}</div><div className={"lesson-card "+(i===0?"featured":"")}><span className="small-index">STEP {i+1} · {s.minutes} MIN</span><h3>{s.title}</h3><p>{s.objective}</p><span className="activity-label">{s.activity==="apply"?"Apply your understanding":s.activity==="explain"?"Start with foundations":"Practice and connect ideas"}</span><button onClick={()=>openLesson(s.conceptId)}>{i===0?"Start lesson":"View lesson"} <ArrowRight size={15}/></button></div></div>)}</div></section>
 <ConversationJourney steps={roadmap.journey||[]}/>
 <LearningCurveDashboard sessionId={sessionId} current={roadmap.analysis}/>
 <RoadmapVisual conceptId={roadmap.analysis.conceptId} title={roadmap.analysis.conceptTitle} evidence={roadmap.analysis.evidence}/>
 <section className="journey-card future-preview" data-testid="roadmap-future"><span className="tiny-label">YOUR NEXT DISCOVERY</span><h2>Why does this chapter matter outside school?</h2><p>{explorerFor(roadmap.analysis.conceptId).scenario}</p><div className="future-tags">{explorerFor(roadmap.analysis.conceptId).fields.map(x=><span key={x}>{x}</span>)}</div><button onClick={()=>openLesson(roadmap.analysis.conceptId)}>Explore the real-life mission <ArrowRight size={15}/></button></section>
 <StudyRoomWidget conceptId={roadmap.analysis.conceptId}/>
 <section className="journey-card evidence-card"><div className="section-title"><div><span className="tiny-label">02 / YOUR LEARNING EVIDENCE</span><h2>What EXO understood</h2></div><span className="soft-pill">{roadmap.reviewProvider} · {roadmap.analysisTimeMs} ms</span></div><p className="explain-notice">{roadmap.analysis.rationale} Evidence matching is preliminary, not a reliable grade. Incorrect and unverified are different states.</p>
 <div className="evidence-list">{roadmap.analysis.evidence.map(e=><div className="evidence-row" key={e.objective}><span className={"evidence-status "+e.status}>{e.status==="correct"?<CheckCircle2 size={17}/>:e.status==="misconception"?<Lightbulb size={17}/>:<CircleHelp size={17}/>}</span><div><b>{e.objective}</b><span className="status-text">{e.status==="correct"?"Mentioned correctly — verify later":e.status==="misconception"?"Possible misconception":"Not checked yet"}</span><p>{e.note}</p>{e.quote&&<blockquote>“{e.quote}”</blockquote>}</div></div>)}</div><div className="engine-note"><BrainCircuit size={17}/> Analysis method: {roadmap.analysis.analysisMethod}. {roadmap.analysis.studentTurns} explanation turns reviewed. Rules handle clear cases; AI is optional for ambiguous claims.</div></section></>:null}
 {view==="lesson"&&lesson?<><div className="journey-intro"><div><div className="eyebrow">EXO GUIDED LESSON</div><h1>{lesson.title}</h1><p>{lesson.chapter} · Class {lesson.grade??10} {lesson.subject??"Science"}</p></div><button className="recheck" onClick={()=>practiceConcept(lesson.id)}><AudioLines size={16}/> Practice with EXO</button></div><LearningHub concept={lesson} detail={lessonDetail} sessionId={sessionId} onPractice={()=>practiceConcept(lesson.id)} learningFocus={roadmap?.analysis.conceptId===lesson.id?roadmap.analysis.evidence.find(e=>e.status!=="correct")?.objective:undefined}/><StudyRoomWidget conceptId={lesson.id}/><div className="lesson-workspace"><div className="lesson-main">{lessonLoading&&<div className="journey-card">Loading a source-grounded lesson…</div>}<div className="lesson-highlight"><span>01 · THE BIG IDEA</span><h2>Understand it simply.</h2><p>{lesson.summary}</p>{lessonDetail?.warning&&<p className="lesson-source-warning">{lessonDetail.warning}</p>}</div><div className="journey-card concept-visual"><span className="tiny-label">VISUAL EXPLANATION</span>{visualLoading?<div className="visual-wait"><RefreshCw size={18}/> Preparing your concept diagram from a reviewed template…</div>:visual?<><h2>{visual.title}</h2><p>{visual.caption}</p><div className="visual-canvas"><svg viewBox="0 0 800 215" role="img" aria-label={visual.title} xmlns="http://www.w3.org/2000/svg"><defs><marker id="concept-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#7889b8"/></marker></defs>{visual.links.slice(0,3).map((link,i)=><g key={"link-"+i}><path d={"M"+(174+i*205)+" 93 L"+(222+i*205)+" 93"} stroke="#7889b8" strokeWidth="2" markerEnd="url(#concept-arrow)" fill="none"/><text x={200+i*205} y="126" fontSize="10" textAnchor="middle" fill="#7b8aa3">{link.slice(0,16)}</text></g>)}{visual.nodes.slice(0,4).map((n,i)=><g key={n.label} transform={"translate("+(16+i*205)+",42)"}><rect width="165" height="96" rx="15" fill={i===0?"#edf1ff":"#f5f7fc"} stroke="#d7def5"/><text x="82" y="40" textAnchor="middle" fill="#3e5185" fontSize="15" fontWeight="700">{n.label.slice(0,20)}</text><text x="82" y="65" textAnchor="middle" fill="#72839d" fontSize="11">{n.detail.slice(0,23)}</text></g>)}</svg></div><p className="diagram-note">Diagram type: {visual.source==="teacher-reviewed-template"?"reviewed scientific concept template":"study overview"}. It is a schematic, not a photograph.</p></>:<p>Visual unavailable. The text lesson remains accessible.</p>}</div><div className="journey-card"><span className="tiny-label">02 · KEY BUILDING BLOCKS</span><h2>What to remember</h2>{lesson.essentials.map((x,i)=><div key={x} className="lesson-point"><span>{i+1}</span>{x}</div>)}</div>{lessonDetail?.workedExample&&<div className="journey-card worked-math"><span className="tiny-label">STEP-BY-STEP MATHEMATICS</span><h2>Let's solve an example</h2><p className="math-problem">{lessonDetail.workedExample.problem}</p><ol>{lessonDetail.workedExample.working.map((step,i)=><li key={i}>{step}</li>)}</ol><div className="math-result"><b>{lessonDetail.workedExample.answer}</b><small>{lessonDetail.workedExample.check}</small></div></div>}<div className="journey-card"><span className="tiny-label">03 · A COMMON MIX-UP</span><h2>Check this misconception</h2><p>{lesson.misconception}</p></div><div className="journey-card"><span className="tiny-label">04 · TRY EXPLAINING</span><h2>{lesson.question}</h2><p>Use EXO to explain your reasoning aloud. Your next roadmap will use the new evidence.</p><button className="primary-lesson-btn" onClick={()=>practiceConcept(lesson.id)}>Explain to EXO <ArrowRight size={16}/></button></div></div><aside className="lesson-aside"><div className="journey-card"><GraduationCap size={26}/><h3>Master it in small steps</h3><p>Understand the idea, check a misconception, then explain it back. No memorization-only shortcut.</p></div>{lessonDetail?.prerequisites&&lessonDetail.prerequisites.length>0&&<div className="journey-card"><b>Before you start</b><p>{lessonDetail.prerequisites.join(" · ")}</p></div>}<div className="journey-card"><b>Book references</b><p>{lessonDetail?.resource?"Original lesson notes with an external NCERT chapter reference. Full textbook not locally available.":"Uploaded NCERT PDFs are searched privately. Page references use PDF numbering; OCR may contain errors."}</p>{lessonDetail?.citations?.map(c=><div key={c.title+"-"+c.page} className="source-cite">{c.title} · PDF page {c.page}</div>)}{lessonDetail?.resource&&<a href={lessonDetail.resource.url} target="_blank" rel="noopener noreferrer">Open official chapter PDF <ExternalLink size={13}/></a>}<a href="https://ncert.nic.in/textbook.php?jemh1=0-14" target="_blank" rel="noopener noreferrer">NCERT textbook index <ExternalLink size={13}/></a></div></aside></div></>:null}
 </div>}
 </main></div>;
}
