// Safe connectivity diagnostic: never print API keys or raw provider responses.
// Run: node --env-file=.env.local scripts/check-providers.mjs
const checks=[
{name:"NVIDIA NIM",key:process.env.NVIDIA_API_KEY,url:"https://integrate.api.nvidia.com/v1/chat/completions",model:process.env.NVIDIA_MODEL||"nvidia/nemotron-3.5-lightning-30b-a3b"},
{name:"OpenRouter",key:process.env.OPENROUTER_API_KEY,url:"https://openrouter.ai/api/v1/chat/completions",model:process.env.OPENROUTER_MODEL||"openrouter/free"}
];
for(const provider of checks){
 if(!provider.key){console.log(provider.name+": not configured");continue}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7500);
 try{
  const response=await fetch(provider.url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+provider.key},body:JSON.stringify({model:provider.model,messages:[{role:"user",content:"Return the word OK."}],max_tokens:200,temperature:0}),signal:controller.signal});
  const obj=await response.json().catch(()=>({}));
  const ok=typeof obj?.choices?.[0]?.message?.content==="string";
  const errorType=typeof obj?.error?.type==="string"?obj.error.type:typeof obj?.error?.code==="string"?obj.error.code:"none";
  console.log(provider.name+" status="+response.status+" usable="+ok+" contentType="+typeof obj?.choices?.[0]?.message?.content+" messageFields="+Object.keys(obj?.choices?.[0]?.message||{}).join(",").slice(0,80)+" errorType="+errorType.slice(0,45));
 }catch(e){console.log(provider.name+" network="+(e instanceof Error?e.name:"unknown"))}finally{clearTimeout(timer)}
}
