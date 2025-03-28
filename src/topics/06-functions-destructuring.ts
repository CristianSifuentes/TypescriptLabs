

interface Product {
    description: string;
    price: number;
}

const phone: Product = { 
    description: 'Nokia A1',
    price: 100
}

const tablet: Product = { 
    description: 'Samsung A1',
    price: 200
}

// const shopingCart: Product[] = [phone, tablet];
//const shopingCart: Product[]

interface TaxCalculationOptions { 
    tax: number;
    products: Product[];
}


function taxCalculation(options: TaxCalculationOptions): number[] {
    let total = 0;
    options.products.forEach( product=> {
        total += product.price;
        // total = total * product.price; what is the difference?

    });
    return [total, total * options.tax];
}


const shopingCart = [phone, tablet];
//const shopingCart: Product[]
const tax = 0.15;
const result = taxCalculation({
    products : shopingCart, 
    // tax: tax // EcmaScript 6
     tax // EcmaScript 5
});

console.log('Total:', result[0]);
console.log('Tax:', result[1]);
console.log('Total + Tax:', result[0] + result[1]);

export { };