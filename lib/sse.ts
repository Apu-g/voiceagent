export type StreamEvent={event:string;data:unknown};
export function parseSSE(input:string,onEvent:(event:StreamEvent)=>void):string{
 let buffer=input.replace(/\r\n/g,"\n");
 let index:number;
 while((index=buffer.indexOf("\n\n"))>=0){
  const frame=buffer.slice(0,index);buffer=buffer.slice(index+2);
  const lines=frame.split("\n");const event=lines.find(x=>x.startsWith("event:"))?.slice(6).trim()||"message";
  const data=lines.filter(x=>x.startsWith("data:")).map(x=>x.slice(5).trimStart()).join("\n");
  if(!data||data==="[DONE]")continue;
  try{onEvent({event,data:JSON.parse(data)})}catch{onEvent({event,data})}
 }
 return buffer;
}
export function eventFrame(event:string,data:unknown):string{
 return "event: "+event+"\ndata: "+JSON.stringify(data)+"\n\n";
}
