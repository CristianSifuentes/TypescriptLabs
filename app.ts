// function saludar(nombre: string) {
// 	console.log('Hola ' + nombre);
// }

// var wolverine = {
// 	nombre: 'Cristian'
// };

// saludar(wolverine.nombre);

// let mensaje = 'hola';

// if (true) {
// 	let mensaje = 'adios';
// }

// console.log(mensaje);

// const MAYUSCULA = 'TODAS';

// //NO SE PUEDE CAMBIAR SU VALOR
// //MAYUSCULA = '123';

// if (true) {
// 	const MAYUSCULA = 'NINGUNA';
// }

// let nombre: string = 'string';
// let numero: number = 123;
// let boleano: boolean = true;
// let hoy: Date = new Date();
// hoy = new Date('2022-10-21');
// console.log(hoy);
// let cualquiera: any; //tipo de dato cualquiera, string, number, boolean, date

// let spidername = {
// 	nombre: 'juan',
// 	edad: 20
// };

// spidername = {
// 	nombre: 'mario',
// 	edad: 30
// };

// function getNombre() {
// 	return 'FEr';
// }

// let nombre: string = 'Juan';
// let apellidopaterno: string = 'gomez';
// let apellidomaterno: string = 'perez';
// let edad: number = 23;

// let x = 'hola' + nombre + ' ' + apellidopaterno + ' ' + apellidomaterno + '(' + edad + ')';
// let texto = `Hola, ${nombre} ${apellidopaterno}`;

// let texto2: string = ` ${getNombre()} `;

// console.log(x);
// console.log(texto);
// console.log(texto2);

// function activar(quien: string, objeto: string = 'batiseñal', momento?: string) {
// 	let mensaje: string;

// 	if (momento) {
// 		mensaje = `${quien} activó la batiseñal  la ${objeto} en la ${momento}`;
// 	} else {
// 		mensaje = `${quien} activó la batiseñal  la ${objeto}`;
// 	}

// 	console.log(mensaje);
// }

// activar('Jaime', 'batiseñal', 'en la tarde');

// let miFuncion = function(a: string) {
// 	return a;
// };

// let miFuncionF = (a: string) => a;

// let miFuncion2 = function(a: number, b: number) {
// 	return a + b;
// };

// let miFuncion2F = (a: number, b: number) => a + b;

// let miFuncion3 = function(nombre: string) {
// 	nombre = nombre.toUpperCase();
// 	return nombre;
// };

// let miFunction3F = (nombre: string) => nombre.toUpperCase;

// let nombre = "Pedro";

// //this no es afectado
// let hulk = {
//     nombre: "Hulk",
//     smach() {

//         setTimeout(() => console.log(this.nombre + " smash!!"), 1500);

//     }
// }

// hulk.smach();

let avenger = {
	nombre: 'Steve',
	clave: 'Capitan america',
	poder: 'Droga'
};

// let nombre = avenger.nombre;
// let clave = avenger.clave;
// let poder = avenger.poder;

let { nombre, clave, poder } = avenger;

console.log(nombre, clave, poder);

let fruits: string[] = [ 'Apple', 'Orange', 'Banana' ];
let avengers: string[] = [ 'Thor', 'Steve', 'Tony' ];
let [ thor, steve, tony ] = avengers;
