export type QuizQuestion={id:string;question:string;options:[string,string,string,string];correct:number;explanation:string};
export const quizBank:Record<string,QuizQuestion[]>={
 photosynthesis:[
  {id:"p1",question:"Which substance supplies carbon atoms used to make plant sugars?",options:["Sunlight","Carbon dioxide","Oxygen gas","Chlorophyll"],correct:1,explanation:"Carbon dioxide is the carbon source; light supplies energy."},
  {id:"p2",question:"What is the main function of chlorophyll in photosynthesis?",options:["Absorbing light energy","Producing soil","Carrying water through roots","Storing oxygen"],correct:0,explanation:"Chlorophyll absorbs light energy."},
  {id:"p3",question:"Which combination is needed for normal photosynthesis?",options:["Only oxygen and heat","Water, carbon dioxide and light","Only water","Only glucose"],correct:1,explanation:"Water and carbon dioxide are raw materials; light provides the energy."}
 ],
 electricity:[
  {id:"e1",question:"In a basic closed circuit, which quantity measures charge flowing per second?",options:["Resistance","Current","Mass","Power factor"],correct:1,explanation:"Electric current is electric charge per unit time."},
  {id:"e2",question:"A 3 Ω resistor has 6 V across it. What is the current under Ohm's law?",options:["18 A","0.5 A","2 A","9 A"],correct:2,explanation:"I = V/R = 6/3 = 2 A."},
  {id:"e3",question:"Which arrangement lets household devices operate independently?",options:["Series only","Parallel branches","Open circuits","No conductors"],correct:1,explanation:"Parallel connections allow devices to be controlled separately."}
 ],
 "maths-10-preview-4":[
  {id:"q1",question:"What are the solutions to x² − 5x + 6 = 0?",options:["1 and 6","−2 and −3","2 and 3","0 and 5"],correct:2,explanation:"(x−2)(x−3)=0, so x=2 or x=3."},
  {id:"q2",question:"What is the discriminant of ax² + bx + c = 0?",options:["b²−4ac","a+b+c","2a","b²+4ac"],correct:0,explanation:"The discriminant is b²−4ac."},
  {id:"q3",question:"A quadratic has a negative discriminant. How many real roots does it have?",options:["Exactly one","Two distinct","Infinitely many","None"],correct:3,explanation:"For real coefficients, D < 0 means no real roots."}
 ],
 "maths-10-preview-8":[
  {id:"t1",question:"In a right triangle, sin θ equals…",options:["Adjacent/Hypotenuse","Opposite/Hypotenuse","Opposite/Adjacent","Hypotenuse/Opposite"],correct:1,explanation:"Sine is opposite divided by hypotenuse."},
  {id:"t2",question:"A 3–4–5 triangle has sin θ = 3/5. What is cos θ for that angle?",options:["4/5","5/4","3/4","1/5"],correct:0,explanation:"Adjacent side is 4; hypotenuse is 5."},
  {id:"t3",question:"Which identity holds for any real angle θ?",options:["sin θ + cos θ = 1","sin²θ + cos²θ = 1","tan θ = 1","sin²θ − cos²θ = 1"],correct:1,explanation:"The Pythagorean trigonometric identity is sin²θ + cos²θ = 1."}
 ],
 "science-9-1":[
  {id:"m1",question:"Why does perfume spread through a room?",options:["Particles are stationary","Particles move and diffuse","Air has no particles","Only gravity moves smells"],correct:1,explanation:"Particles move continuously and diffuse through air."},
  {id:"m2",question:"Which state is generally most compressible?",options:["Solid","Liquid","Gas","All equally"],correct:2,explanation:"Gas particles have comparatively large spaces between them."},
  {id:"m3",question:"What typically happens to particle motion when a substance is heated?",options:["It stops","It slows","It generally increases","It becomes impossible"],correct:2,explanation:"Average kinetic energy of particles generally increases with temperature."}
 ],
 "maths-10-preview-14":[
  {id:"pr1",question:"What is the probability of rolling an even number on a fair six-sided die?",options:["1/6","1/3","1/2","2/3"],correct:2,explanation:"Three of six equally likely results are even."},
  {id:"pr2",question:"What is P(not E) if P(E)=0.3?",options:["0.7","1.3","0.3","3.0"],correct:0,explanation:"The complement probability is 1−0.3 = 0.7."},
  {id:"pr3",question:"Which probability is impossible?",options:["0","0.25","1","1.2"],correct:3,explanation:"Probabilities are between 0 and 1 inclusive."}
 ]
};
export function getQuiz(topic:string){return quizBank[topic]||[]}
