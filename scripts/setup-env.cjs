// Read a local untracked credentials file. Never print or commit values.
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),file=path.join(root,"passwords.txt");
if(!fs.existsSync(file)){console.log("No passwords.txt found");process.exit(0)}
const lines=fs.readFileSync(file,"utf8").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
const config={};
for(const line of lines){
 const low=line.toLowerCase();
 const key=low.includes("mongodb")?"MONGODB_URI":low.includes("openrouter")?"OPENROUTER_API_KEY":low.includes("nvidia")||low.includes("nim")?"NVIDIA_API_KEY":low.includes("groq")?"GROQ_API_KEY":null;
 if(!key)continue;
 let value="";
 if(key==="MONGODB_URI"){
  const at=line.indexOf("mongodb+srv://");if(at>=0)value=line.slice(at).trim();
 }else{
  const match=line.match(/(?:\s+-\s+|\s*[:=]\s*|\s+)([^\s]+)$/);
  if(match)value=match[1].trim();
 }
 if(value){config[key]=value.replace(/^["']|["']$/g,"");}
}
fs.writeFileSync(path.join(root,".env.local"),Object.entries(config).map(([k,v])=>k+"="+JSON.stringify(v)).join("\n")+"\n",{mode:0o600});
console.log("Configured credential names only:",Object.keys(config).join(", "));
