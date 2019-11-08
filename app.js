"use strict";
// function saludar(nombre: string) {
// 	console.log('Hola ' + nombre);
// }
function enviarMision(xmen) {
    console.log('Enviando a: ' + xmen.nombre);
}
function enviarCuartel(xmen) {
    console.log('Enviando a: ' + xmen.nombre);
}
var wolverine = {
    nombre: 'wolverine',
    poder: 'regeneracion'
};
enviarMision(wolverine);
enviarCuartel(wolverine);
