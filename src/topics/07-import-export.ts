

import { Product, TaxCalculationOptions, taxCalculation } from './06-functions-destructuring';

const shopingCart: Product[] = [
    { description: 'Phone', price: 1000 },
    { description: 'Tablet', price: 2000 },
    { description: 'Monitor', price: 3000 },
    { description: 'Laptop', price: 4000 },
];
const taxOptions: TaxCalculationOptions = {
    tax: 0.23,
    products: shopingCart,
};
//[] is used when we want to return an array, {} is used when we want to return an object
const { total, taxTotal } = taxCalculation( taxOptions);
console.log('Total in import/export tss:', total);
console.log('Tax Total in import/export ts:', taxTotal);
// const { total, taxTotal } = taxCalculation({ products: shopingCart, tax });

// When export we need to be sure that not exec code, when used export is transformed to module
// export { }; // this is a module, not a script, so we can use import and export
// export { taxCalculation } // this is a module, not a script, so we can use import and export
// export { taxCalculation, Product, TaxCalculationOptions } // this is a module, not a script, so we can use import and export 

//ECMAScript 5 is not supported claass -> functions
//ECMAScript 6 is supported class

