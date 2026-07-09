


export function whatsMyType<T> (argumen: T): T {
  return argumen;
  // Whe need to avoid any 
}// In converted a module 

let amIString = whatsMyType<string>('Hello World');
let amIArray = whatsMyType<number[]>([1,2,3,4,5]);
let amIObject = whatsMyType<object>({name: 'Juan', age: 30});
let amIBoolean = whatsMyType<boolean>(true); 
let amINumber = whatsMyType<number>(123); //number

// whait is a let 
// what is a const
// what is a var
// what is a function
// what is a class
// what is a module
// what is a namespace
// what is a type
// what is a interface
// what is a enum
// what is a tuple
// what is a union
// what is a intersection
// what is a generics
// what is a any
// what is a unknown
// what is a never  
// what is a void
// what is a object
// what is a array  
// what is a string
// what is a number 
// what is a boolean

console.log('amIString:', amIString.split(' ')); //string
console.log('amIArray:', amIArray.join('-')); //array
// join() is a method of the array class that returns a string representation of the array with the elements separated by the specified separator
console.log('amIObject:', amIObject); //object
console.log('amIBoolean:', amIBoolean); //boolean
console.log('amINumber:', amINumber.toFixed()); //number
// toFixed() is a method of the number class that returns a string representation of the number with a fixed number of decimal places