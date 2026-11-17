import {randomBytes,createHash,randomUUID} from "node:crypto";
import {getDB} from "./mongodb";
import {getConcept} from "./curriculum";
import {getQuiz} from "./group-quiz";
type Member={id:string;name:string;credential:string;score:number;answer?:number};
export type StudyRoom={code:string;conceptId:string;phase:"study"|"quiz"|"review"|"finished";focus:"logic"|"course"|"future";questionIndex:number;createdAt:string;expiresAt:string;version:number;hostId:string;members:Member[]};
const local=new Map<string,StudyRoom>();
const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const credential=(token:string)=>createHash("sha256").update(token).digest("hex");
const tokenPattern=/^[a-f0-9]{48}$/;
const validCode=/^[A-HJ-NP-Z2-9]{8}$/;
function makeCode(){return Array.from(randomBytes(8),n=>alphabet[n%alphabet.length]).join("")}
function sanitized(name:string){return name.replace(/[^a-zA-Z0-9 ._-]/g,"").trim().slice(0,22)}
function safeMember(m:Member){return {id:m.id,name:m.name,score:m.score,answered:typeof m.answer==="number"}}
export function validRoomCode(code:string){return validCode.test(code)}
export function roomView(room:StudyRoom,token:string){
 const member=room.members.find(m=>m.credential===credential(token));
 if(!member)throw new Error("Not a member of this room");
 const bank=getQuiz(room.conceptId),current=bank[room.questionIndex];
 const reveal=room.phase==="review"||room.phase==="finished";
 return {code:room.code,conceptId:room.conceptId,phase:room.phase,expiresAt:room.expiresAt,
  questionIndex:room.questionIndex,totalQuestions:bank.length,focus:room.focus||"logic",isHost:member.id===room.hostId,
  playerId:member.id,players:room.members.map(safeMember),
  question:room.phase==="study"||!current?null:{id:current.id,question:current.question,options:current.options,
   ...(reveal?{correct:current.correct,explanation:current.explanation}:{})},
  canQuiz:bank.length>=2,storage:"server"};
}
async function collection(){
 try{const db=await getDB();if(!db)return null;return db.collection<StudyRoom>("study_rooms")}catch{return null}
}
export async function loadRoom(code:string):Promise<StudyRoom|null>{
 if(!validCode.test(code))return null;
 const col=await collection();
 const room=col?await col.findOne({code}):local.get(code);
 if(!room)return null;
 if(Date.parse(room.expiresAt)<Date.now()){if(!col)local.delete(code);return null}
 return room;
}
export async function createRoom(conceptId:string,name:string){
 if(!getConcept(conceptId))throw new Error("Unknown topic");
 const clean=sanitized(name);if(clean.length<2)throw new Error("Nickname needs at least 2 letters");
 if(local.size>350){for(const [id,r] of local)if(Date.parse(r.expiresAt)<Date.now())local.delete(id)}
 const col=await collection();
 for(let tries=0;tries<5;tries++){
  const code=makeCode(),token=randomBytes(24).toString("hex"),memberId=randomUUID();
  const room:StudyRoom={code,conceptId,phase:"study",focus:"logic",questionIndex:0,version:0,createdAt:new Date().toISOString(),
   expiresAt:new Date(Date.now()+1000*60*60*2).toISOString(),hostId:memberId,
   members:[{id:memberId,name:clean,credential:credential(token),score:0}]};
  if(col){
   if(await col.findOne({code}))continue;
   try{await col.insertOne(room);return {token,room:roomView(room,token),storage:"mongodb"}}catch{continue}
  }
  if(local.has(code))continue;local.set(code,room);return {token,room:roomView(room,token),storage:"temporary-server-memory"};
 }
 throw new Error("Unable to create room");
}
type Action="join"|"begin"|"answer"|"next"|"leave"|"focus";
export async function changeRoom(code:string,action:Action,input:{token?:string;name?:string;option?:number;focus?:string}){
 if(!validCode.test(code))throw new Error("Invalid room code");
 const col=await collection();
 for(let attempt=0;attempt<6;attempt++){
  const room=col?await col.findOne({code}):local.get(code);
  if(!room||Date.parse(room.expiresAt)<Date.now())throw new Error("Room not found or expired");
  const next:StudyRoom={...room,members:room.members.map(x=>({...x}))};
  let token=input.token||"";
  if(action==="join"){
   if(next.phase!=="study")throw new Error("This room has started the quiz");
   const name=sanitized(input.name||"");
   if(name.length<2)throw new Error("Enter a nickname with at least 2 letters");
   if(next.members.length>=8)throw new Error("Room is full (8 learners maximum)");
   token=randomBytes(24).toString("hex");
   next.members.push({id:randomUUID(),name,credential:credential(token),score:0});
  }else{
   if(!tokenPattern.test(token))throw new Error("Invalid access token");
   const member=next.members.find(x=>x.credential===credential(token));
   if(!member)throw new Error("Room access denied");
   const isHost=member.id===next.hostId,bank=getQuiz(next.conceptId);
   if(action==="focus"){
    if(!isHost||next.phase!=="study")throw new Error("Only the host can change the study focus");
    if(!["logic","course","future"].includes(input.focus||""))throw new Error("Invalid study focus");
    next.focus=input.focus as "logic"|"course"|"future";
   }else if(action==="begin"){
    if(!isHost)throw new Error("Only the host can start the quiz");
    if(!bank.length)throw new Error("No reviewed quiz questions for this topic yet");
    next.phase="quiz";next.questionIndex=0;next.members.forEach(m=>{delete m.answer;m.score=0});
   }else if(action==="answer"){
    if(next.phase!=="quiz")throw new Error("Question is not accepting answers");
    if(typeof member.answer==="number")throw new Error("Answer already submitted");
    if(!Number.isInteger(input.option)||Number(input.option)<0||Number(input.option)>3)throw new Error("Invalid option");
    member.answer=input.option;
    if(input.option===bank[next.questionIndex].correct)member.score+=100;
    if(next.members.every(m=>typeof m.answer==="number"))next.phase="review";
   }else if(action==="next"){
    if(!isHost)throw new Error("Only the host can change rounds");
    if(next.phase!=="review")throw new Error("Finish the current round before moving forward");
    if(next.questionIndex+1>=bank.length)next.phase="finished";
    else{next.questionIndex++;next.phase="quiz";next.members.forEach(m=>{delete m.answer})}
   }else if(action==="leave"){
    if(member.id===next.hostId)throw new Error("Room host cannot leave; close the tab to end your session");
    next.members=next.members.filter(m=>m.id!==member.id);
    if(next.phase==="quiz"&&next.members.every(m=>typeof m.answer==="number"))next.phase="review";
   }
  }
  next.version=room.version+1;
  if(col){
   const result=await col.replaceOne({code,version:room.version},next);
   if(!result.modifiedCount)continue;
  }else{
   local.set(code,next);
  }
  return {token,room:action==="leave"?null:roomView(next,token),storage:col?"mongodb":"temporary-server-memory"};
 }
 throw new Error("Room was updated concurrently, try again");
}
