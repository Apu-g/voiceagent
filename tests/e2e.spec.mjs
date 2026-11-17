import {test,expect} from "@playwright/test";

test("mentor can generate and navigate a roadmap",async({page})=>{
 await page.goto("http://localhost:3000");
 await expect(page.getByText("Think aloud.")).toBeVisible();
 await expect(page.getByText("Do you have a science question", {exact:false})).toBeVisible();
 await page.getByRole("button",{name:"I have a question"}).click();
 await expect(page.getByText("What's on your mind?",{exact:false})).toBeVisible();
 await page.getByRole("button",{name:/Let's learn/i}).click();
 await expect(page.getByRole("heading",{name:"Your next learning steps"})).toBeVisible({timeout:15000});
 await expect(page.getByRole("heading",{name:"What EXO understood"})).toBeVisible();
 await expect(page.getByTestId("personalized-visual")).toBeVisible();
 await expect(page.getByRole("img",{name:/Concept map for/})).toBeVisible();
 await expect(page.getByText("Not checked yet").first()).toBeVisible();
 const lessonButton=page.getByRole("button",{name:/Start lesson/i});
 await lessonButton.click();
 await expect(page.getByText("THE BIG IDEA",{exact:false}).first()).toBeVisible();
 await page.getByRole("button",{name:/Back to roadmap/}).click();
 await expect(page.getByRole("heading",{name:"Your next learning steps"})).toBeVisible();
 await page.screenshot({path:"test-results/mentor-roadmap-desktop.png",fullPage:true});
});

test("lesson practice retains the roadmap and lesson navigation",async({page})=>{
 await page.goto("http://localhost:3000");
 await page.getByRole("button",{name:/Let's learn/i}).click();
 await expect(page.getByRole("heading",{name:"Your next learning steps"})).toBeVisible({timeout:15000});
 await page.getByRole("button",{name:"Start lesson"}).click();
 await page.getByRole("button",{name:/Practice with EXO/}).click();
 await expect(page.getByText("Let's practice",{exact:false})).toBeVisible();
 await page.getByRole("button",{name:/My learning path/}).click();
 await expect(page.getByRole("heading",{name:"Your next learning steps"})).toBeVisible();
});

test("mobile can open topics and the roadmap",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("http://localhost:3000");
 await page.getByRole("button",{name:"Open menu"}).click();
 await expect(page.getByText("NCERT Science · Class 10")).toBeVisible();
 await page.getByRole("button",{name:"My learning path"}).click();
 await expect(page.getByRole("heading",{name:"Your next learning steps"})).toBeVisible({timeout:15000});
 await page.screenshot({path:"test-results/mentor-roadmap-mobile.png",fullPage:true});
});

test("microphone final transcript can be sent hands-free",async({page})=>{
 await page.addInitScript(()=>{
  class FakeRecognition {
   lang="en-IN"; continuous=false;interimResults=true;onresult=null;onerror=null;onend=null;
   start(){setTimeout(()=>{
    this.onresult?.({resultIndex:0,results:[Object.assign([{transcript:"I have a question"}],{isFinal:true})]});
    this.onend?.();
   },50);}
   stop(){this.onend?.();}
  }
  window.SpeechRecognition=FakeRecognition;
 });
 await page.goto("http://localhost:3000");
 await page.getByRole("checkbox",{name:"Auto-send when I finish speaking"}).check();
 await page.getByRole("button",{name:"Start microphone"}).click();
 await expect(page.getByText("What's on your mind?",{exact:false})).toBeVisible({timeout:10000});
 await expect(page.getByText("I have a question",{exact:true}).last()).toBeVisible();
});

test("grade 9/10 textbook shelf and source-grounded lessons",async({page})=>{
 await page.goto("http://localhost:3000");
 await page.getByRole("button",{name:"Class 9"}).click();
 await expect(page.getByText("Matter in Our Surroundings").first()).toBeVisible();
 await page.getByRole("button",{name:"Mathematics"}).click();
 await expect(page.getByText("Number Systems").first()).toBeVisible();
 await page.getByRole("button",{name:"Class 10"}).click();
 await expect(page.getByText("Contents preview only")).toBeVisible();
 await page.getByRole("button",{name:"Science",exact:true}).click();
 await expect(page.getByText("Photosynthesis").first()).toBeVisible();
});
test("Start Speaking streams incremental EXO speech and Stop Speaking ends loop",async({page})=>{
 await page.addInitScript(()=>{
  const state={starts:0,spoken:[]};window.__voiceTest=state;
  class FakeUtterance{constructor(text){this.text=text;this.onend=null;this.onerror=null;this.onstart=null}}
  Object.defineProperty(window,"SpeechSynthesisUtterance",{configurable:true,value:FakeUtterance});
  Object.defineProperty(window,"speechSynthesis",{configurable:true,value:{
    speak(u){state.spoken.push(u.text);setTimeout(()=>{u.onstart?.();setTimeout(()=>u.onend?.(),20)},5)},
    cancel(){},getVoices(){return []}
  }});
  class FakeRecognition{
   lang="en-IN";continuous=false;interimResults=true;onresult=null;onerror=null;onend=null;
   start(){state.starts++;if(state.starts===1)setTimeout(()=>{
    this.onresult?.({resultIndex:0,results:[Object.assign([{transcript:"Tell me what photosynthesis means"}],{isFinal:true})]});this.onend?.()
   },35)}
   stop(){this.onend?.()}
  }
  window.SpeechRecognition=FakeRecognition;
 });
 await page.route("**/api/chat/stream",route=>route.fulfill({
  status:200,contentType:"text/event-stream",
  body:[
    "event: metadata",'data: {"sources":[]}',"",
    "event: token",'data: {"text":"Photosynthesis uses sunlight as energy. "}',"",
    "event: token",'data: {"text":"Plants use carbon dioxide and water to make sugar."}',"",
    "event: done",'data: {"provider":"groq","sources":[]}',"",""
  ].join("\n")
 }));
 await page.goto("http://localhost:3000");
 await page.getByRole("button",{name:"Start Speaking"}).click();
 await expect(page.getByText("Tell me what photosynthesis means",{exact:true})).toBeVisible({timeout:9000});
 await expect(page.getByText("Photosynthesis uses sunlight as energy.",{exact:false})).toBeVisible({timeout:9000});
 await expect.poll(()=>page.evaluate(()=>window.__voiceTest.spoken.length)).toBeGreaterThanOrEqual(2);
 await page.getByRole("button",{name:"Stop Speaking"}).click();
 await expect(page.getByText("Conversation complete",{exact:false})).toBeVisible();
 await expect(page.getByRole("button",{name:"Start Speaking"})).toBeVisible();
});
test("root tolerates an externally injected html data attribute",async({page})=>{
 const warnings=[];
 page.on("console",m=>{if(m.type()==="error"&&m.text().includes("hydrated but"))warnings.push(m.text())});
 await page.addInitScript(()=>{document.documentElement?.setAttribute("data-chatcmd-chatcmd-context","injected-by-test")});
 await page.goto("http://localhost:3000");
 await expect(page.getByRole("button",{name:"Start Speaking"})).toBeVisible();
 expect(warnings).toEqual([]);
});

test("Class 10 Mathematics has full original lesson workflow and official chapter links",async({page})=>{
 await page.goto("http://localhost:3000");
 await page.getByRole("button",{name:"Mathematics",exact:true}).click();
 await expect(page.getByText("Contents preview only")).toBeVisible();
 await page.getByRole("button",{name:/04 Quadratic Equations/}).click();
 await page.getByRole("button",{name:/Let's learn/}).click();
 await expect(page.getByRole("heading",{name:"Your next learning steps"})).toBeVisible();
 await expect(page.locator(".roadmap-step").first()).toContainText("Polynomials");
 await page.getByRole("button",{name:"View lesson"}).first().click();
 await expect(page.getByRole("heading",{name:"Quadratic Equations",exact:true})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Let's solve an example"})).toBeVisible();
 await expect(page.getByText("x = 2 or x = 3.")).toBeVisible();
 await expect(page.getByRole("link",{name:/Open official chapter PDF/})).toHaveAttribute("href","https://ncert.nic.in/textbook/pdf/jemh104.pdf");
 await expect(page.getByText("This original lesson links to the official NCERT chapter PDF.",{exact:false})).toBeVisible();
 await page.screenshot({path:"test-results/math-grade10-lesson.png",fullPage:true});
 await page.getByRole("button",{name:"Practice with EXO"}).click();
 await expect(page.getByText("Let's practice quadratic equations.",{exact:false})).toBeVisible();
 await page.getByRole("button",{name:"My learning path"}).click();
 await expect(page.getByRole("heading",{name:"Your next learning steps"})).toBeVisible();
});

test("three learning pathways, YouTube fallback and study progress work",async({page})=>{
 await page.goto("http://localhost:3000");
 await page.getByRole("button",{name:/Let's learn/}).click();
 await expect(page.getByTestId("roadmap-future")).toBeVisible();
 await page.getByRole("button",{name:"View lesson"}).first().click();
 const hub=page.getByTestId("learning-hub");
 await expect(hub.getByRole("tab",{name:/Crack the Logic/})).toBeVisible();
 await hub.getByRole("tab",{name:/Beyond the Classroom/}).click();
 await expect(hub.getByText("Design a sunny balcony garden")).toBeVisible();
 await hub.getByRole("button",{name:/Mark this path explored/}).click();
 await expect(hub.getByText("1/3 explored")).toBeVisible();
 await hub.getByRole("tab",{name:/Ace Your Course/}).click();
 await expect(hub.getByRole("button",{name:/Practise with EXO/})).toBeVisible();
 await expect(hub.getByText("Watch a topic explanation")).toBeVisible();
 await expect(hub.getByRole("link",{name:/Search this topic on YouTube/})).toHaveAttribute("href",/youtube.com\/results/);
 await page.reload();
 await page.getByRole("button",{name:/Let's learn/}).click();
 await page.getByRole("button",{name:"View lesson"}).first().click();
 await expect(page.getByTestId("learning-hub").getByText("1/3 explored")).toBeVisible();
});
test("two students study together in a private room and receive server-scored quiz results",async({page,browser})=>{
 test.setTimeout(90000);
 const guestContext=await browser.newContext(),guest=await guestContext.newPage();
 try{
  await page.goto("http://localhost:3000");
  await page.getByRole("button",{name:/Let's learn/}).click();
  const hostRoom=page.getByTestId("study-room");
  await hostRoom.getByRole("textbox",{name:"Your study nickname"}).fill("Student One");
  await hostRoom.getByRole("button",{name:/Create room/}).click();
  await expect(hostRoom.getByText("Share code")).toBeVisible();
  const roomCode=(await hostRoom.locator(".room-code b").innerText()).trim();
  expect(roomCode).toHaveLength(8);
  await guest.goto("http://localhost:3000");
  await guest.getByRole("button",{name:/Let's learn/}).click();
  const guestRoom=guest.getByTestId("study-room");
  await guestRoom.getByRole("textbox",{name:"Your study nickname"}).fill("Student Two");
  await guestRoom.getByRole("textbox",{name:"Study room code"}).fill(roomCode);
  await guestRoom.getByRole("button",{name:"Join room"}).click();
  await expect(guestRoom.getByText("Student Two (you)")).toBeVisible();
  await expect(hostRoom.getByText("Student Two")).toBeVisible({timeout:9000});
  await hostRoom.getByRole("button",{name:"Real-world Mission"}).click();
  await expect(guestRoom.getByText("Design a sunny balcony garden")).toBeVisible({timeout:9000});
  await hostRoom.getByRole("button",{name:/Start 3-question challenge/}).click();
  await expect(guestRoom.getByText("Which substance supplies carbon atoms", {exact:false})).toBeVisible({timeout:9000});
  await hostRoom.getByRole("button",{name:/B. Carbon dioxide/}).click();
  await guestRoom.getByRole("button",{name:/A. Sunlight/}).click();
  await expect(hostRoom.getByText("Carbon dioxide is the carbon source",{exact:false})).toBeVisible({timeout:9000});
  await hostRoom.getByRole("button",{name:/Next question/}).click();
  await expect(guestRoom.getByText("ROUND 2 OF 3")).toBeVisible({timeout:9000});
  await hostRoom.getByRole("button",{name:/A. Absorbing light energy/}).click();
  await guestRoom.getByRole("button",{name:/A. Absorbing light energy/}).click();
  await hostRoom.getByRole("button",{name:/Next question/}).click();
  await hostRoom.getByRole("button",{name:/B. Water, carbon dioxide and light/}).click();
  await guestRoom.getByRole("button",{name:/B. Water, carbon dioxide and light/}).click();
  await hostRoom.getByRole("button",{name:/See final scores/}).click();
  await expect(guestRoom.getByText("Challenge complete")).toBeVisible({timeout:9000});
  await expect(hostRoom.getByText("Student One — 300 points")).toBeVisible();
  await expect(hostRoom.getByText("Student Two — 200 points")).toBeVisible();
 }finally{await guestContext.close()}
});

test("YouTube video is selected and embedded inside a chapter lesson",async({page})=>{
 test.setTimeout(60000);
 await page.addInitScript(()=>{window.YT={Player:class {constructor(frame,options){setTimeout(()=>options.events.onError?.({data:101}),250)}destroy(){}}}});
 await page.route("**/api/videos?conceptId=photosynthesis*",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
  status:"ready",searchUrl:"https://www.youtube.com/results?search_query=photosynthesis",
  videos:[{id:"M7lc1UVf-VE",title:"Sample YouTube embedded lesson",channel:"YouTube",description:"Embedding test",
  embedUrl:"https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0",watchUrl:"https://www.youtube.com/watch?v=M7lc1UVf-VE"}]
 })}));
 await page.goto("http://localhost:3000");
 await page.getByRole("button",{name:/Let's learn/}).click();
 await expect(page.getByRole("heading",{name:"Your next learning steps"})).toBeVisible({timeout:25000});
 await page.getByRole("button",{name:"View lesson"}).first().click();
 const hub=page.getByTestId("learning-hub");
 await expect(hub.getByText("Sample YouTube embedded lesson")).toBeVisible();
 await hub.getByRole("button",{name:/Sample YouTube embedded lesson/}).click();
 await expect(hub.locator("iframe")).toHaveAttribute("src",/youtube\.com\/embed\/M7lc1UVf-VE\?rel=0/);
 await expect(hub.getByRole("link",{name:/Watch on YouTube/})).toHaveAttribute("href","https://www.youtube.com/watch?v=M7lc1UVf-VE");
 await expect(hub.locator("iframe")).toHaveAttribute("title",/YouTube lesson/);
 await expect(hub.getByRole("alert").getByText("The creator disabled playback on external websites.",{exact:false})).toBeVisible({timeout:8000});
});

test("moon tides question is answered and the roadmap follows actual conversation topic",async({page})=>{
 test.setTimeout(60000);
 await page.goto("http://localhost:3000");
 await page.getByRole("button",{name:"Reflection of light",exact:true}).click();
 const question="why can't moon full Earth towards itself because of the gravity and only pulls the Tides from the ocean";
 await page.getByRole("textbox",{name:"Message to EXO"}).fill(question);
 await page.getByRole("button",{name:"Send",exact:true}).click();
 await expect(page.getByText("The Moon does pull the whole Earth",{exact:false})).toBeVisible({timeout:25000});
 await page.getByRole("button",{name:/Let's learn/}).click();
 await expect(page.getByRole("heading",{name:"Your next learning steps"})).toBeVisible({timeout:30000});
 const steps=page.locator(".roadmap-step");
 await expect(steps.first()).toContainText("Why the Moon causes tides");
 await expect(steps.nth(1)).toContainText("How gravity pulls objects");
 await expect(steps.nth(2)).toContainText("Why the Moon stays in orbit");
 await expect(steps).toHaveCount(3);
 await expect(page.getByTestId("learning-curve")).toBeVisible();
 await expect(page.getByTestId("learning-curve").getByText("Ideas to check")).toBeVisible();
 await expect(page.getByTestId("learning-curve").getByText("Relevant claims observed")).toBeVisible();
 await page.getByRole("button",{name:"Start lesson"}).click();
 await expect(page.getByRole("heading",{name:"Why the Moon causes tides",exact:true})).toBeVisible();
 await expect(page.getByTestId("learning-hub")).toBeVisible();
});

test("student dashboard starts honestly and follows a contextual learning review",async({page})=>{
 test.setTimeout(75000);
 await page.goto("http://localhost:3000");
 await page.getByRole("button",{name:"My progress dashboard"}).click();
 const dashboard=page.getByTestId("student-dashboard");
 await expect(dashboard).toBeVisible();
 await expect(dashboard.getByText("Your learning map begins with one question.")).toBeVisible();
 await expect(dashboard.getByText("Topics discovered")).toBeVisible();
 await dashboard.getByRole("button",{name:/Talk with EXO/}).click();
 await page.getByRole("textbox",{name:"Message to EXO"}).fill("why does the Moon pull the whole Earth but we see tides in the oceans?");
 await page.getByRole("button",{name:"Send",exact:true}).click();
 await expect(page.getByText("The Moon does pull the whole Earth",{exact:false})).toBeVisible({timeout:25000});
 await page.getByRole("button",{name:/Let's learn/}).click();
 await expect(page.getByRole("heading",{name:"Your next learning steps"})).toBeVisible({timeout:25000});
 await page.getByRole("button",{name:"My progress dashboard"}).click();
 await expect(dashboard).toBeVisible();
 await expect(dashboard.getByText("Why the Moon causes tides").first()).toBeVisible();
 await expect(dashboard.getByText("Questions are not mistakes.",{exact:false})).toBeVisible();
 await expect(dashboard.getByTestId("dashboard-learning-story")).toBeVisible();
 await expect(dashboard.getByTestId("dashboard-learning-trend")).toBeVisible();
 await dashboard.getByRole("button",{name:/Continue this topic/}).click();
 await expect(page.getByTestId("learning-hub")).toBeVisible({timeout:15000});
});

test("circuits analysis shows evidence first and never includes stale Moon roadmap",async({page})=>{
 test.setTimeout(65000);
 await page.route("**/api/chat/stream",route=>route.fulfill({
  status:200,contentType:"text/event-stream",
  body:['event: token','data: {"text":"In series circuits, current follows one path. Parallel circuits have branches."}',
    '', 'event: done','data: {"provider":"test","sources":[]}', '', ''].join("\n")
 }));
 await page.goto("http://localhost:3000");
 await page.getByRole("button",{name:"Series and parallel circuits",exact:true}).click();
 await page.getByRole("textbox",{name:"Message to EXO"}).fill("Why do resistors work differently in series and parallel circuits?");
 await page.getByRole("button",{name:"Send",exact:true}).click();
 await expect(page.getByText("In series circuits, current follows one path.",{exact:false})).toBeVisible();
 await page.getByRole("button",{name:/Let's learn/}).click();
 const analysis=page.getByTestId("roadmap-analysis");
 await expect(analysis).toBeVisible({timeout:30000});
 await expect(analysis).toContainText("Series and parallel circuits");
 await expect(analysis).toContainText("0");
 await expect(analysis).toContainText("starter roadmap");
 const steps=page.locator(".roadmap-step");
 await expect(steps).toHaveCount(2);
 await expect(steps.first()).toContainText("Series and parallel circuits");
 await expect(steps.nth(1)).toContainText("Current, voltage and resistance");
 await expect(page.getByTestId("personalized-visual")).toContainText("What you said");
 await expect(page.getByTestId("roadmap-future")).not.toContainText("Moon");
 await page.getByRole("button",{name:"Start lesson"}).click();
 await expect(page.getByTestId("learning-hub")).toBeVisible();
 await expect(page.getByRole("heading",{name:"Series and parallel circuits",exact:true})).toBeVisible();
});

test("voice replies prefer an installed male voice without paid API calls",async({page})=>{
 await page.addInitScript(()=>{
  const voices=[{name:"Microsoft Heera",lang:"en-IN"},{name:"Microsoft Ravi - English (India)",lang:"en-IN"}];
  window.__spokenVoices=[];
  class MockUtterance{constructor(text){this.text=text;this.voice=null;this.lang="";this.onstart=null;this.onend=null;this.onerror=null}}
  Object.defineProperty(window,"SpeechSynthesisUtterance",{configurable:true,value:MockUtterance});
  Object.defineProperty(window,"speechSynthesis",{configurable:true,value:{
   getVoices(){return voices},
   speak(u){window.__spokenVoices.push({voice:u.voice?.name,rate:u.rate,pitch:u.pitch});queueMicrotask(()=>{u.onstart?.();u.onend?.()})},
   cancel(){}
  }});
 });
 await page.goto("http://localhost:3000");
 await page.getByRole("button",{name:"I have a question"}).click();
 await expect(page.getByText("What's on your mind?",{exact:false})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__spokenVoices.length)).toBeGreaterThan(0);
 const chosen=await page.evaluate(()=>window.__spokenVoices[0]);
 expect(chosen.voice).toContain("Microsoft Ravi");
 expect(chosen.rate).toBeLessThan(1);
 expect(chosen.pitch).toBe(1);
});

test("startup quiz and video fetch errors auto-recover without breaking game submissions",async({page})=>{
 test.setTimeout(60000);
 let quizAttempts=0,videoAttempts=0;
 await page.route("**/api/learning-quiz?*",async route=>{
  if(route.request().method()==="GET"&&quizAttempts++===0)return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"Simulated startup unavailable"})});
  return route.continue();
 });
 await page.route("**/api/videos?*",async route=>{
  if(videoAttempts++===0)return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"Simulated video startup error"})});
  return route.continue();
 });
 await page.goto("http://localhost:3000");
 await page.getByRole("button",{name:/Let's learn/i}).click();
 await expect(page.getByRole("heading",{name:"Your next learning steps"})).toBeVisible({timeout:25000});
 await page.getByRole("button",{name:"Start lesson"}).click();
 const hub=page.getByTestId("learning-hub");
 const quiz=hub.getByTestId("quiz-logic");
 await expect(quiz.locator("fieldset")).toHaveCount(3,{timeout:25000});
 expect(quizAttempts).toBeGreaterThanOrEqual(2);
 await expect(hub.getByText("Finding chapter-specific learning videos…")).toBeHidden({timeout:25000});
 expect(videoAttempts).toBeGreaterThanOrEqual(2);
 for(const field of await quiz.locator("fieldset").all())await field.locator("input[type=radio]").first().check();
 await quiz.getByRole("button",{name:/Check answers/}).click();
 await expect(quiz.locator(".quiz-final")).toBeVisible({timeout:25000});
 await expect(quiz.locator(".quiz-final")).toContainText("points");
 await page.getByRole("button",{name:"My progress dashboard"}).click();
 await expect(page.getByTestId("student-dashboard")).toBeVisible();
});
