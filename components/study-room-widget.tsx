"use client";
import {useEffect,useState} from "react";
import {Users,Copy,Trophy,PlayCircle,ArrowRight,CheckCircle2,RefreshCw,LockKeyhole} from "lucide-react";
import {explorerFor} from "@/lib/learning-lanes";
type PublicMember={id:string;name:string;score:number;answered:boolean};
type Room={code:string;conceptId:string;phase:"study"|"quiz"|"review"|"finished";focus:"logic"|"course"|"future";isHost:boolean;playerId:string;players:PublicMember[];questionIndex:number;totalQuestions:number;canQuiz:boolean;question:null|{id:string;question:string;options:string[];correct?:number;explanation?:string}};
export function StudyRoomWidget({conceptId}:{conceptId:string}){
 const [room,setRoom]=useState<Room|null>(null),[code,setCode]=useState(""),[nickname,setNickname]=useState(""),[token,setToken]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[storage,setStorage]=useState("");
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{
  const stored=sessionStorage.getItem("exo-study-room");
  queueMicrotask(()=>{if(stored){try{const pair=JSON.parse(stored);if(pair.code&&pair.token){setCode(pair.code);setToken(pair.token)}}catch{}}
   setLoaded(true)});
 },[]);
 useEffect(()=>{
  if(!loaded||!code||!token)return;
  let disposed=false;
  const refresh=async()=>{
   try{
    const res=await fetch("/api/study-room?code="+encodeURIComponent(code),{headers:{"x-room-token":token},cache:"no-store"});
    const d=await res.json();if(disposed)return;
    if(res.ok)setRoom(d.room);else{setError(d.error||"Study room disconnected");setRoom(null)}
   }catch{if(!disposed)setError("Connection interrupted — retrying")}
  };
  void refresh();const timer=setInterval(refresh,2200);
  return()=>{disposed=true;clearInterval(timer)};
 },[loaded,code,token]);
 async function action(kind:string,extra:Record<string,unknown>={}){
  if(busy)return;setBusy(true);setError("");
  try{
   const res=await fetch("/api/study-room",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:kind,code,token,name:nickname,conceptId,...extra})});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"Room operation failed");
   if(kind==="create"||kind==="join"){
    sessionStorage.setItem("exo-study-room",JSON.stringify({code:data.room.code,token:data.token}));
    setCode(data.room.code);setToken(data.token);
   }
   if(data.room)setRoom(data.room);
   if(data.storage)setStorage(data.storage);
   if(kind==="leave"){sessionStorage.removeItem("exo-study-room");setRoom(null);setToken("");setCode("")}
  }catch(e){setError(e instanceof Error?e.message:"Room operation failed")}finally{setBusy(false)}
 }
 function disconnect(){sessionStorage.removeItem("exo-study-room");setRoom(null);setToken("");setCode("");setError("")}
 return <section className="journey-card exo-room" data-testid="study-room">
  <div className="section-title"><div><span className="tiny-label">STUDY TOGETHER</span><h2><Users size={20}/> EXO Study Arena</h2></div>{room&&<span className="soft-pill">{room.phase==="study"?"Study room":room.phase==="finished"?"Complete":"Quiz challenge"}</span>}</div>
  {!room?<><p>Explore the same topic with friends, then try a fair knowledge challenge together. Share only a room code. No public chat or webcam.</p>
    <div className="room-entry"><input aria-label="Your study nickname" placeholder="Nickname (no real name needed)" maxLength={22} value={nickname} onChange={e=>setNickname(e.target.value)}/>
    <button disabled={busy||nickname.trim().length<2} onClick={()=>action("create")}><Users size={15}/> Create room</button></div>
    <div className="room-entry"><input aria-label="Study room code" placeholder="8-character room code" maxLength={8} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/>
    <button disabled={busy||code.length!==8||nickname.trim().length<2} onClick={()=>action("join")}>Join room <ArrowRight size={15}/></button></div></>:
   <div className="room-session">
    <div className="room-code"><span>Share code</span><b>{room.code}</b><button aria-label="Copy room code" onClick={()=>navigator.clipboard?.writeText(room.code)}><Copy size={16}/></button><button onClick={disconnect} className="room-exit">Leave view</button></div>
    <p className="room-note"><LockKeyhole size={13}/> Up to 8 learners · No voice/video broadcast · Each participant uses their own device</p>
    <div className="room-members">{room.players.map(p=><div key={p.id} className="room-member"><span>{p.name}{p.id===room.playerId?" (you)":""}</span><b>{p.score} pts</b>{p.answered&&<CheckCircle2 size={14}/>}</div>)}</div>
    {room.phase==="study"&&<><p>Everyone studies the same chapter. The host chooses the group focus; each device updates automatically. When ready, start the server-scored quiz.</p><div className="group-focus"><b>Group focus: {room.focus==="logic"?"Crack the Logic":room.focus==="course"?"Ace Your Course":"Beyond the Classroom"}</b>{room.isHost&&<div className="group-focus-actions">{(["logic","course","future"] as const).map(f=><button key={f} disabled={busy||room.focus===f} onClick={()=>action("focus",{focus:f})}>{f==="logic"?"Foundations":f==="course"?"CBSE Course":"Real-world Mission"}</button>)}</div>}{room.focus==="logic"?<p>Explain the idea in your own words, identify one misconception and ask each other why it works.</p>:room.focus==="course"?<p>Open the lesson chapter and work through the NCERT-style questions together before attempting the challenge.</p>:<p><b>{explorerFor(room.conceptId).title}:</b> {explorerFor(room.conceptId).challenge}</p>}</div>{room.canQuiz?
     room.isHost?<button onClick={()=>action("begin")} disabled={busy}><PlayCircle size={17}/> Start 3-question challenge</button>:<p>Host is preparing the quiz.</p>:
     <p>Reviewed multiplayer quiz questions have not been added for this chapter yet. The room can still be used for studying.</p>}</>}
    {(room.phase==="quiz"||room.phase==="review")&&room.question&&<div className="room-quiz">
     <span className="tiny-label">ROUND {room.questionIndex+1} OF {room.totalQuestions}</span>
     <h3>{room.question.question}</h3>
     <div className="room-options">{room.question.options.map((option,i)=>{
      const answered=room.players.find(p=>p.id===room.playerId)?.answered;
      return <button key={i} disabled={busy||room.phase!=="quiz"||answered} className={room.phase==="review"&&room.question?.correct===i?"answer-correct":""} onClick={()=>action("answer",{option:i})}>{String.fromCharCode(65+i)}. {option}</button>;
     })}</div>
     {room.phase==="quiz"&&<p>{room.players.find(p=>p.id===room.playerId)?.answered?"Answer saved. Waiting for friends.":"Choose one answer. You cannot change it after submission."}</p>}
     {room.phase==="review"&&<><p className="answer-explanation">{room.question.explanation}</p>{room.isHost?<button onClick={()=>action("next")} disabled={busy}><ArrowRight size={15}/> {room.questionIndex+1===room.totalQuestions?"See final scores":"Next question"}</button>:<p>Waiting for the host to continue.</p>}</>}
    </div>}
    {room.phase==="finished"&&<div className="room-finish"><Trophy size={22}/><h3>Challenge complete</h3>{[...room.players].sort((a,b)=>b.score-a.score).map((p,i)=><p key={p.id}>{i+1}. {p.name} — {p.score} points</p>)}<p>Scores show answers to this small quiz, not academic mastery.</p></div>}
    <button className="room-refresh" onClick={()=>{setCode("");setTimeout(()=>setCode(room.code),0)}}><RefreshCw size={12}/> Refresh room</button>
   </div>}
  {error&&<p role="alert" className="room-error">{error}</p>}
  {storage==="temporary-server-memory"&&<p className="room-note">Development room: state lives in server memory and may reset on restart. Configure MongoDB for shared deployment.</p>}
 </section>;
}
