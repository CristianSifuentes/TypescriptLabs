
//function addNumbers(): void
//function addNumbers(): undefined
//function addNumbers(a: any, b: any): undefined
// strictic TypeScript
// function addNumbers(a: any, b: any){
//    return undefined;
// }


function addNumbers(a: number, b: number){
    return a + b;
 }

 //03-functions.ts(11, 21): An argument for 'a' was not provided.
//  addNumbers();

//const number: number
// const number = addNumbers(1, 1);

//Type 'number' is not assignable to type 'string'.ts(2322)
// const number: string = addNumbers(1, 1);

//const number: string
const number: string = addNumbers(1, 1).toString();



//Arraw function
//const addNumbersArrow: (a: number, b: number) => number
// const addNumbersArrow = (a: number, b: number) => {
//     return a + b;
// };

//function signature : string =>
//const addNumbersArrow: (a: number, b: number) => string
 const addNumbersArrow = (a: number, b: number) : string => {
    //Type 'number' is not assignable to type 'string'.ts(2322)
    //  return a + b;
    return `${a + b}`;
 };

 const number2: string = addNumbersArrow(1, 1).toString();

 //function multiply(firstNumber: any, secondNumber: any, base: any): number
function multiply(firstNumber: number, secondNumber?: number, base: number = 2){
    return firstNumber * base;
}

//Type 'number' is not assignable to type 'string'.ts(2322)
const multiplyResult: number = multiply(5)
 //Literal object
 //TypeScript infers everything
// console.log({result: number, result2: number2, result3: multiplyResult});



interface CharacterX {
    name: string;
    hp: number;
    showHp: () => void;

}

//const healCharacter = (character, amount) => {  
//const healCharacter: (character: CharacterX, amount: number) => void

const healCharacter = (character: CharacterX , amount: number) => {
    //Property 'pv' does not exist on type 'CharacterX'.ts(2339)
    character.hp += amount;
}


const strinderX: CharacterX = {
    name: 'Strider', 
    hp: 50, 
    showHp(){
        console.log(`life points ${ this.hp}`);
    }
}

healCharacter(strinderX, 10);

strinderX.showHp();


export {};