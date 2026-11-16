export interface Passanger {
   name: string;
   age: number;
   children?: string[];
}


const passenger1: Passanger = { 
    name: 'Juan',
    age: 30,
}


const passenger2: Passanger = { 
    name: 'Artur',
    age: 45,
    children: ['Maria', 'Elizabeth']
}



const printChildren = (passanger: Passanger ) : number => {
   const howManyChildren = passanger.children?.length ?? 0; //optional chaining + nullish coalescing (?? only replaces null/undefined)
   console.log( passanger.name, howManyChildren);
   return howManyChildren;
}

printChildren(passenger1); //0
printChildren(passenger2); //2

printChildren( passenger1 );