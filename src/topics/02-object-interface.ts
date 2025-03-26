// let skills = ['Bash', 'Counter', 'Healing', true, 123];
//let skills: string[]
//let skills: (string | boolean)[]
//let skills: (string | number | boolean)[]

// let skills:  string[]  = ['Bash', 'Counter', 'Healing', true, 123];
//Type 'boolean' is not assignable to type 'string'.ts(2322)
//Type 'number' is not assignable to type 'string'.ts(2322)

const skills:  string[]  = ['Bash', 'Counter', 'Healing'];
// now is a must in javascript if values never change
// skills = ['Value'];
//Cannot assign to 'skills' because it is a constant.ts(2588)

//When is transpilate to javascript 'interface' has not a respesentation
//type literals objects
interface Character {
   name: string;
   hp: number;
   skills: string[];
   hometown?: string;//String or Undefined
}

//Property 'hometown' is missing in type '{ name: string; hp: number; skills: string[]; }' but required in type 'Character'.ts(2741)
const strider: Character = {
    // name: string = 'Strider',//'string' only refers to a type, but is being used as a value here.ts(2693), literals objets
    name: 'Strider', 
    hp: 100, 
    skills: ['Bash', 'Counter']
}


strider.hometown = 'Rivendell';

console.table(strider);



export {};