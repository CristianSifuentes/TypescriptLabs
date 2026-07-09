// usually we dont create decorator only use it
// decorator is a function that is called when we create an instance of the class
// you can use decorator in the class, method, property, parameter, accessor
function classDecorator<T extends { new (...args:any[]) : {}}>(
    constructor: T
){
   return class extends constructor {
        newProperty: string = 'New Property'; //default value
        hello: string = 'Hello World'; //default value
        
    }
}
// What is a primitive in JS?
// What is a primitive in TS?
// In Angular everything is a classes the unique thats change is the decorator
/*
Unable to resolve signature of class decorator when called as an expression.
  This expression is not callable.
    Type 'void' has no call signatures.
*/
@classDecorator
export class SuperClass {
    public myProperty: string = 'Default Value'; //default value
    constructor() {
        console.log('SuperClass');
    }
}

console.log('SuperClass:', SuperClass); //SuperClass: class SuperClass { public myProperty: string; constructor(); }
// prinf class definiton 
const myClass = new SuperClass();
console.log('myClass:', myClass); //myClass: SuperClass { myProperty: 'Default Value' }
//Whats the difference between class definition and instance?
