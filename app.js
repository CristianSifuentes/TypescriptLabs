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
// let avenger = {
// 	nombre: 'Steve',
// 	clave: 'Capitan america',
// 	poder: 'Droga'
// };
// // let nombre = avenger.nombre;
// // let clave = avenger.clave;
// // let poder = avenger.poder;
// let { nombre, clave, poder } = avenger;
// console.log(nombre, clave, poder);
// let fruits: string[] = [ 'Apple', 'Orange', 'Banana' ];
// let avengers: string[] = [ 'Thor', 'Steve', 'Tony' ];
// let [ thor, steve, tony ] = avengers;
//procesos asincronos
// let prom1 = new Promise(function(resolve, reject) {
// 	setTimeout(() => {
// 		console.log('Promesa terminada');
// 		resolve();
// 		reject();
// 	}, 1500);
// });
// prom1.then(
// 	function() {
// 		console.log('ejecutarme cuando se termine bien!');
// 	},
// 	function() {
// 		console.log('ejecutarme cuando se termine mal!');
// 	}
// );
// interface Xmen {
// 	nombre: string;
// 	poder: string;
// }
// function enviarMision(xmen: Xmen) {
// 	console.log('Enviando a: ' + xmen.nombre);
// }
// function enviarCuartel(xmen: Xmen) {
// 	console.log('Enviando a: ' + xmen.nombre);
// }
// let wolverine: Xmen = {
// 	nombre: 'wolverine',
// 	poder: 'regeneracion'
// };
// enviarMision(wolverine);
// enviarCuartel(wolverine);
// class Avenger {
// 	nombre: string = 'sin nombre';
// 	equipo: string = '';
// 	nombreReal: string = '';
// 	puedePelear: boolean | undefined;
// 	peleasGanadas: number = 0;
// 	//funcion que se crea cuando se crea una nueva instancia de este objeto
// 	constructor(nombre: string, equipo: string, nombreReal: string) {
// 		this.nombre = nombre;
// 		this.equipo = equipo;
// 		this.nombreReal = nombreReal;
// 	}
// }
// let antman: Avenger = new Avenger('Antman', 'Cap', 'Scott lang');
// console.log(antman);
/*Examen*/
// Uso de Let y Const
var nombre = 'Ricardo Tapia';
var edad = 23;
var PERSONAJE = {
    nombre: nombre,
    edad: edad
};
var batman = {
    nombre: 'Bruno Díaz',
    artesMarciales: ['Karate', 'Aikido', 'Wing Chun', 'Jiu-Jitsu']
};
// Convertir esta funcion a una funcion de flecha
function resultadoDoble(a, b) {
    return (a + b) * 2;
}
var resultadoDobleF = function (a, b) { return (a + b) * 2; };
// Función con parametros obligatorios, opcionales y por defecto
// donde NOMBRE = obligatorio
//       PODER  = opcional
//       ARMA   = por defecto = "arco"
function getAvenger(nombre, arma, poder) {
    if (arma === void 0) { arma = 'arco'; }
    var mensaje;
    if (poder) {
        mensaje = nombre + ' tiene el poder de: ' + poder + ' y un arma: ' + arma;
    }
    else {
        mensaje = nombre + ' tiene un ' + poder;
    }
}
// Cree una clase que permita manejar la siguiente estructura
// La clase se debe de llamar rectangulo,
// debe de tener dos propiedades:
//   * base
//   * altura
// También un método que calcule el área  =  base * altura,
// ese método debe de retornar un numero.
var Rectangulo = /** @class */ (function () {
    //funcion que se crea cuando se crea una nueva instancia de este objeto
    function Rectangulo(base, altura) {
        this.base = 0;
        this.altura = 0;
        this.resultado = 0.0;
        this.resultado = base * altura;
    }
    return Rectangulo;
}());
var valor = new Rectangulo(1, 9);
console.log(valor.resultado);
