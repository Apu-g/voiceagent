import test from "node:test";import assert from "node:assert/strict";
import {preferredMaleVoice,clearSpeechSettings,sarvamVoiceFor} from "../lib/voice-selection.ts";
test("prefers clear matching-locale known male browser voice",()=>{
 const voices=[{name:"Microsoft Heera Online",lang:"en-IN"},{name:"Microsoft Ravi - English (India)",lang:"en-IN"},{name:"Microsoft David",lang:"en-US"}];
 assert.equal(preferredMaleVoice(voices,"en-IN")?.name,"Microsoft Ravi - English (India)");
 assert.equal(preferredMaleVoice(voices,"en-US")?.name,"Microsoft David");
 assert.equal(preferredMaleVoice(voices,"kn-IN"),undefined);
});
test("browser gender preference does not infer gender from pitch alone",()=>{
 assert.equal(preferredMaleVoice([{name:"English India Default",lang:"en-IN"}],"en-IN"),undefined);
 assert.equal(clearSpeechSettings().pitch,1);
 assert.ok(clearSpeechSettings().rate<1);
});
test("Sarvam male voices are explicit and compatible with selected models",()=>{
 assert.deepEqual(sarvamVoiceFor("en-IN"),{model:"bulbul:v4-flash",speaker:"dev_en_conversational"});
 assert.deepEqual(sarvamVoiceFor("hi-IN"),{model:"bulbul:v4-flash",speaker:"tarun_hi_conversational"});
 assert.deepEqual(sarvamVoiceFor("kn-IN"),{model:"bulbul:v3",speaker:"shubh"});
 assert.deepEqual(sarvamVoiceFor("ml-IN"),{model:"bulbul:v3",speaker:"shubh"});
});
