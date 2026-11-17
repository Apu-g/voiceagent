import {MongoClient,Db} from "mongodb";
let clientPromise:Promise<MongoClient>|undefined;
export async function getDB():Promise<Db|null>{
 const uri=process.env.MONGODB_URI;
 if(!uri) return null;
 if(!clientPromise){const client=new MongoClient(uri,{maxPoolSize:5,serverSelectionTimeoutMS:4000,connectTimeoutMS:4000});clientPromise=client.connect().catch(e=>{clientPromise=undefined;throw e;});}
 return (await clientPromise).db(process.env.MONGODB_DB||"explaino");
}
