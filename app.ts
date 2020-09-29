// if you dont specify types is asigned any like default
function suma(v1: number, v2 : number): number {
    return v1 + v2;
}
suma(10, 10)

// first you need specify requered parameters and after that all optional parameters
function optional(required: string, optional?: string): string {
   return required + optional;
}
//
function constant(constant: string = "Value", optional?: string ): string {
    return constant + optional
}
// only we can return undefined if use void
function returvoid(constant: string = "Value", optional?: string): void {
   return undefined; 
}
// only in funcions that never finish
// function returnever(): never {

// }

//console.log(returvoid())



class Video {
    title: string;
    //Constructor, only exists one constructor into a class
    //no return 
    constructor(title: string){
       this.title = title;
    } 
    
    printTitle(){
       console.log(this.title);
    }

    changeTitle(title: string){
      this.title = title;
    }

    getTitle(): string {  return this.title }

    play() { console.log('Playing'); }
    stop() { console.log('Stoppig') }
}


class YouTubeVideo extends Video {

}


let miVideo: Video = new Video('mi title');

miVideo.printTitle();
miVideo.changeTitle('Change mi title');
console.log(miVideo.getTitle());

console.log(miVideo.play());
console.log(miVideo.stop());



