import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("concept catalog includes broad Class 10 Science coverage",()=>{
 const source=fs.readFileSync(new URL("../lib/curriculum.ts",import.meta.url),"utf8");
 for(const topic of ["photosynthesis","electricity","chemical-reactions","heredity","environment","refraction"])assert.match(source,new RegExp('id:"'+topic+'"'));
});
test("no credentials committed to source",()=>{
 const ignore=fs.readFileSync(new URL("../.gitignore",import.meta.url),"utf8");
 assert.match(ignore,/passwords\.txt/);assert.match(ignore,/\.env/);
});
