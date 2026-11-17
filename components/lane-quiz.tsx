"use client";
import {useEffect,useState} from "react";
import {CheckCircle2,RotateCcw,ClipboardCheck} from "lucide-react";
import type {LearningLane} from "@/lib/learning-lanes";
import type {QuizPublicQuestion} from "@/lib/learning-quizzes";
type Result={score:number;total:number;passed:boolean;points:number;results:Array<{questionId:string;correct:boolean;correctIndex:number;explanation:string}>;best:{passed:boolean;score:number;attempts:number}};
export function LaneQuiz({conceptId,lane,sessionId,learningFocus,onResult}:{conceptId:string;lane:LearningLane;sessionId:string;learningFocus?:string;onResult?:(passed:boolean)=>void}){
 const [questions,setQuestions]=useState<QuizPublicQuestion[]>([]),[answers,setAnswers]=useState<Record<string,number>>({}),[result,setResult]=useState<Result|null>(null),[best,setBest]=useState<{passed:boolean;score:number;attempts:number}|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{
  let live=true;
  fetch("/api/learning-quiz?conceptId="+encodeURIComponent(conceptId)+"&lane="+lane+"&sessionId="+encodeURIComponent(sessionId||"none")+"&focus="+encodeURIComponent(learningFocus||""),{cache:"no-store"})
   .then(r=>{if(!r.ok)throw Error("Quiz unavailable");return r.json()}).then(j=>{if(live){setQuestions(j.questions||[]);setBest(j.best||null);setResult(null);setAnswers({});setError("")}})
   .catch(()=>{if(live)setError("The quiz could not load. Try reopening this lesson.")});
  return()=>{live=false};
 },[conceptId,lane,sessionId,learningFocus]);
 async function submit(){
  if(busy||!sessionId||questions.some(q=>answers[q.id]===undefined))return;
  setBusy(true);setError("");
  try{
   const resp=await fetch("/api/learning-quiz",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({conceptId,lane,sessionId,focus:learningFocus||"",answers:questions.map(q=>answers[q.id])})});
   if(!resp.ok)throw Error("Unable to grade quiz");
   const body=await resp.json() as Result;
   setResult(body);setBest(body.best);onResult?.(body.best.passed);
  }catch{setError("Answers could not be saved. Check your connection and retry.")}
  finally{setBusy(false)}
 }
 return <div className="lane-quiz" data-testid={"quiz-"+lane}>
  <div className="lane-quiz-heading"><h3><ClipboardCheck size={18}/> Practice challenge</h3><span>{best?.passed?"Passed · best "+best.score+"/3":"3 checks · pass with 2 correct"}</span></div>
  {questions.map((q,i)=><fieldset key={q.id} className="lane-question-item" disabled={Boolean(result)||busy}>
   <legend>{i+1}. {q.prompt}</legend>
   {q.options.map((o,j)=><label key={j} className={answers[q.id]===j?"chosen":""}><input type="radio" name={q.id} checked={answers[q.id]===j} onChange={()=>setAnswers(a=>({...a,[q.id]:j}))}/><span>{o}</span></label>)}
   {result&&<p className={result.results[i].correct?"quiz-correct":"quiz-review"}>{result.results[i].correct?"Correct. ":"Review this: "}{result.results[i].explanation}</p>}
  </fieldset>)}
  {error&&<p role="alert" className="room-error">{error}</p>}
  {result?<div className="quiz-final" role="status"><b>{result.score}/{result.total} correct · {result.points} points</b><span>{result.passed?"Pathway quiz passed. Review this topic again to strengthen recall.":"Review the explanations and try again. A wrong answer is a learning opportunity."}</span><button onClick={()=>{setAnswers({});setResult(null)}}><RotateCcw size={14}/> Try again</button></div>:
   <button className="lane-quiz-submit" disabled={!sessionId||busy||questions.length!==3||questions.some(q=>answers[q.id]===undefined)} onClick={submit}>Check answers <CheckCircle2 size={16}/></button>}
  <p className="lane-footnote">Questions are built from curated concept facts and scored on the server. The best result is saved; scores do not prove full mastery.</p>
 </div>;
}
