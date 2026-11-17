type Message={role:"system"|"user"|"assistant";content:string};
type Provider={name:string;key?:string;url:string;model:string;headers?:Record<string,string>};
function providerList():Provider[]{
 return [
 {name:"groq",key:process.env.GROQ_API_KEY,url:"https://api.groq.com/openai/v1/chat/completions",model:process.env.GROQ_MODEL||"openai/gpt-oss-20b"},
 {name:"nvidia",key:process.env.NVIDIA_API_KEY,url:"https://integrate.api.nvidia.com/v1/chat/completions",model:process.env.NVIDIA_MODEL||"nvidia/nemotron-3.5-lightning-30b-a3b"},
 {name:"openrouter",key:process.env.OPENROUTER_API_KEY,url:"https://openrouter.ai/api/v1/chat/completions",model:process.env.OPENROUTER_MODEL||"openrouter/free",headers:{"HTTP-Referer":"https://explaino.vercel.app","X-Title":"Explaino"}}
 ];
}
export async function complete(messages:Message[]):Promise<{text:string;provider:string}>{
 const providers=providerList().filter(p=>p.key);
 if(!providers.length) throw new Error("AI_NOT_CONFIGURED");
 for(const p of providers){
  try{
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12500);
   try{
    const resp=await fetch(p.url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${p.key}`,...p.headers},body:JSON.stringify({model:p.model,messages,temperature:0.35,max_tokens:420}),signal:controller.signal,cache:"no-store"});
    if(!resp.ok) continue;
    const data=await resp.json();const text=data?.choices?.[0]?.message?.content;
    if(typeof text==="string"&&text.trim())return {text:text.trim(),provider:p.name};
   }finally{clearTimeout(timer);}
  }catch{continue;}
 }
 throw new Error("AI_PROVIDERS_UNAVAILABLE");
}
export function configuredProviders(){return providerList().filter(p=>Boolean(p.key)).map(p=>p.name)}
