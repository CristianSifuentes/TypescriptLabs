"use strict";
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
function activar(quien, objeto, momento) {
    if (objeto === void 0) { objeto = 'batiseñal'; }
    var mensaje;
    if (momento) {
        mensaje = quien + " activ\u00F3 la batise\u00F1al  la " + objeto + " en la " + momento;
    }
    else {
        mensaje = quien + " activ\u00F3 la batise\u00F1al  la " + objeto;
    }
    console.log(mensaje);
}
activar('Jaime', 'batiseñal', 'en la tarde');
