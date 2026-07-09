// Static Typing
let name = 'Strider';
//Typescript infers a type
//let name: string
// name = 234;
//Type 'number' is not assignable to type 'string'.ts(2322)
name = '1234';

// const name = 'Strider';
//Cannot redeclare block-scoped variable 'name'.ts(2451)
const name_x: string = 'Strider';
//const name_x: "Strider"

let hpPoints: number | string = 95;
// let hpPoints: number | 'FULL' = 95;

//let hpPoints: string | number

hpPoints = 'Full';

const isAlive: boolean = true;
console.log({
    name, hpPoints, isAlive
})



export {};//is a module