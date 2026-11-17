import {getConcept} from "./curriculum";
import type {LearningSnapshot} from "./learning-history";
import type {QuizResult} from "./quiz-progress";
import type {LessonProgressRow} from "./progress-memory";
export type TopicProgress={
 conceptId:string;title:string;chapter:string;lastActivity:string;
 observed:number;unverified:number;misconceptions:number;reviews:number;questions:number;
 lanes:Array<{id:"logic"|"course"|"future";name:string;reviewed:boolean;passed:boolean;score:number|null;total:number|null;attempts:number}>;
 reviewedLanes:number;passedQuizzes:number;videosReviewed:number;
 status:"not-yet-checked"|"in-progress"|"needs-review"|"practiced";
 nextStep:string;
};
export type DashboardSummary={
 topics:TopicProgress[];
 totalTopics:number;activeTopics:number;coveredTopics:number;passedQuizzes:number;reviewedPaths:number;videosReviewed:number;
 timeline:Array<{conceptId:string;title:string;date:string;observed:number;misconceptions:number;unverified:number;questions:number}>;
 focus:TopicProgress|null;
 latestReview:string|null;
};
const laneLabels={logic:"Crack the Logic",course:"Ace Your Course",future:"Beyond the Classroom"} as const;
function newer(a:string,b:string){return !a||b>a?b:a}
export function createDashboardSummary(snapshots:LearningSnapshot[],quizzes:QuizResult[],progress:LessonProgressRow[]):DashboardSummary{
 const ids=[...new Set([...snapshots.map(s=>s.conceptId),...quizzes.map(q=>q.conceptId),...progress.map(p=>p.conceptId)])];
 const topics:TopicProgress[]=ids.map(id=>{
  const reviews=snapshots.filter(s=>s.conceptId===id).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  const latest=reviews.at(-1);
  const attempts=quizzes.filter(q=>q.conceptId===id);
  const path=progress.find(x=>x.conceptId===id);
  const concept=getConcept(id);
  const lanes=(Object.keys(laneLabels) as Array<keyof typeof laneLabels>).map(lane=>{
   const quiz=attempts.find(q=>q.lane===lane);
   return {id:lane,name:laneLabels[lane],reviewed:Boolean(path?.lanes?.[lane]),passed:Boolean(quiz?.passed),score:quiz?.score??null,total:quiz?.total??null,attempts:quiz?.attempts||0};
  });
  const observed=latest?.correct||0,misconceptions=latest?.misconceptions||0,unverified=latest?.unverified||0;
  const reviewedLanes=lanes.filter(l=>l.reviewed).length,passedQuizzes=lanes.filter(l=>l.passed).length;
  const status:TopicProgress["status"]=misconceptions>0?"needs-review":reviewedLanes===3&&passedQuizzes===3?"practiced":reviews.length||reviewedLanes||attempts.length?"in-progress":"not-yet-checked";
  let nextStep="";
  if(misconceptions)nextStep="Review the possible mix-up, then explain the idea in your own words.";
  else if(passedQuizzes<3)nextStep="Try the "+lanes.find(l=>!l.passed)?.name+" quiz to check understanding.";
  else if(reviewedLanes<3)nextStep="Explore "+lanes.find(l=>!l.reviewed)?.name+" and mark it reviewed.";
  else nextStep="Practice with a fresh example later to check what you remember.";
  let lastActivity=latest?.createdAt||"";
  for(const q of attempts)lastActivity=newer(lastActivity,q.updatedAt);
  lastActivity=newer(lastActivity,path?.updatedAt||"");
  return {conceptId:id,title:concept?.title||latest?.conceptTitle||"Science topic",chapter:concept?.chapter||"Learning",lastActivity,
   observed,unverified,misconceptions,reviews:reviews.length,questions:latest?.questions||0,lanes,reviewedLanes,passedQuizzes,videosReviewed:path?.videoReviews?.length||0,status,nextStep};
 }).sort((x,y)=>y.lastActivity.localeCompare(x.lastActivity));
 const timeline=snapshots.slice().sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).slice(-20).map(s=>({
  conceptId:s.conceptId,title:s.conceptTitle,date:s.createdAt,observed:s.correct,misconceptions:s.misconceptions,unverified:s.unverified,questions:s.questions
 }));
 const coveredTopics=topics.filter(t=>t.reviewedLanes===3&&t.passedQuizzes===3).length;
 return {topics,totalTopics:topics.length,activeTopics:topics.filter(t=>t.reviews||t.reviewedLanes||t.passedQuizzes).length,
  coveredTopics,passedQuizzes:topics.reduce((n,t)=>n+t.passedQuizzes,0),reviewedPaths:topics.reduce((n,t)=>n+t.reviewedLanes,0),videosReviewed:topics.reduce((n,t)=>n+t.videosReviewed,0),timeline,focus:topics[0]||null,latestReview:timeline.at(-1)?.date||null};
}
