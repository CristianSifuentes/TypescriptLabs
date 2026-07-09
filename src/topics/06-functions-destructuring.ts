

export interface Product {
    description: string;
    price: number;
}

export interface TaxCalculationOptions { 
    tax: number;
    products: Product[];
}
//----------------------------------------


const phone: Product = { 
    description: 'Nokia A1',
    price: 100
}

const tablet: Product = { 
    description: 'Samsung A1',
    price: 200
}
//------------------------------------------

// const shopingCart: Product[] = [phone, tablet];
//const shopingCart: Product[]



// function taxCalculation(options: TaxCalculationOptions): number[] {
//     let total = 0;
//     options.products.forEach( product=> {
//         total += product.price;
//         // total = total * product.price; what is the difference?

//     });
//     return [total, total * options.tax];
// }



// Destructuring function parameters v1
// function taxCalculation({tax, products}: TaxCalculationOptions) : number[]{
//     let total = 0;
//     products.forEach(({ price }) => {
//       total += price;
//     });
//     return [total, total * tax];

// }

//(method) Array<Product>.forEach(callbackfn: (value: Product, index: number, array: Product[]) => void, thisArg?: any): void
/*
 Performs the specified action for each element in an array.

@param callbackfn — A function that accepts up to three arguments. forEach calls the callbackfn function one time for each element in the array.

@param thisArg — An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value. 
  
 */
// You might even consider returning a named object instead of an array of clarity.
// function taxCalculation({ tax, products} : TaxCalculationOptions){
//    let total = 0;
//    products.forEach(
//     ({ price}) => total += price
//    );
//    return { total, taxTotal: total * tax };
// }
// Stric TypeScript
// We need to unsderstand the difference between the two functions above. The first one returns an array and the second one returns an object.
// The first one is less readable and less maintainable. The second one is more readable and more maintainable.
 export function taxCalculation( options : TaxCalculationOptions){
    let total = 0;
    const { tax, products} = options;
    products.forEach(
     ({ price}) => total += price
    );
    return { total, taxTotal: total * tax };
 }




const shopingCart = [phone, tablet];
//const shopingCart: Product[]
const tax = 0.15;


const { total, taxTotal } = taxCalculation({ products: shopingCart, tax });
console.log('Total:', total);
console.log('Tax:', taxTotal);
console.log('Total + Tax:', total + taxTotal);
// const result = taxCalculation({
//     products : shopingCart, 
//     // tax: tax // EcmaScript 6
//      tax // EcmaScript 5
// });

// console.log('Total:', result[0]);
// console.log('Tax:', result[1]);
// console.log('Total + Tax:', result[0] + result[1]);

//Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'.ts(1205)
// Re-exporting a type when isolatedModules is enabled requires using 
// Export declaration conflicts with exported declaration of Product .

// export { taxCalculation, Product };
export {  };