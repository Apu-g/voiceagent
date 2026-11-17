export type LessonProgressRow={sessionId:string;conceptId:string;lanes:Record<string,boolean>;videoReviews?:string[];updatedAt:string};
const shared=globalThis as typeof globalThis & {__exoLessonProgress?:Map<string,LessonProgressRow>};
const mem=shared.__exoLessonProgress??(shared.__exoLessonProgress=new Map<string,LessonProgressRow>());
export function lessonMemory(){return mem}
export function lessonRows(sessionId:string){return [...mem.values()].filter(r=>r.sessionId===sessionId)}
