import { Person } from './08-classes';

//ECMAScript 5 is not supported claass -> functions
//ECMAScript 6 is supported class -> class
//ECMAScript 7 is supported class -> class

//there is some ways to defined classes
//class -> It is a way to create a mold to create instances of the same mold
//Properties -> are the variables that are inside the class
//Methods -> are the functions that are inside the class
export class Person {
    // public name: string |undefined;
    // public name: string = ''; //default value
    // public name?: string; //default value
    // public name: string; //default value
    // public age: number;
    // private address: string; // private property, only accessible inside the class

    //constructor is a special method that is called when we create an instance of the class


    // constructor(name: string = '', age: number = 0, address: string = 'Unknown' ){
    //  constructor(name: string , age: number , address: string  ){
    //     this.name = name; //default value
    //     this.age = age; //default value
    //     this.address = address; //default value
    // }

    constructor(
         public name: string,
         //public age: number, 
         private address: string = 'Unknown' 
        ){
    }
    
    //Dependency Injection in Angular 
    //Inyect another instance of the class in the constructor ???
}


// extends -> is a way to create a new class that inherits the properties and methods of another class
// export class Hero extends Person {
//     constructor(
//         public alterEgo: string,
//         public age: number,
//         public  realName: string
//     ){
//         //Expected 2-3 arguments, but got 0.ts(2554)
//         super(realName, age); //call the constructor of the parent class
//        //Try to extends the composition
//        //Priotize the composition over inheritance
//     }
// }

export class Hero {
    //public person: Person; //create a new instance of the class Person
    constructor(
        public alterEgo: string,
        public age: number,
        public  realName: string,
        public person: Person
    ){
        //this.person = new Person(realName, age); //create a new instance of the class Person
        //Priotize the composition over inheritance

    }
}

// To try thot our objects has a specific work and make it well
const person = new Person('Tony', 'New York');
//const ironman: Person
//constructor Hero(name: string, age: number, address?: string): Hero
const ironman = new Hero('Ironman', 45, 'Tony', person); //instance of the class Person
console.log('Ironman:', ironman); 
console.log('Ironman name:', ironman.person.name); 
console.log('Ironman age:', ironman.age); 
// console.log('Ironman address:', ironman.address); 
//Property 'address' is private and only accessible within class 'Person'.ts(2341)
