interface AudioPlayer {
    audioVolume: number;
    songDuration: number;
    song: string;
    details: Details;
}

interface Details {
    author: string;
    year: number;       
}

const audioPlayer: AudioPlayer = {
    audioVolume: 50,
    songDuration: 3.5,
    song: 'The Beatles - Hey Jude',
    details: {  
        author: 'The Beatles',
        year: 1968        
    }
}

//Cannot redeclare block-scoped variable 'song'.ts(2451)
const song = "the Beatles - Sargento Pimienta";

//destructuring
 const { audioVolume, songDuration, song: anotherSong, details } = audioPlayer
 const { author } = details;

console.log('Volume:', audioVolume);
// console.log('Song:', anotherSong);   
console.log('Song:', song);     
console.log('Duration:', songDuration);
console.log('Author:', author);
// console.log('Author:', details.author);

// const {   } = audioPlayer
// console.log('Song:', audioPlayer.song);
// console.log('Duration:', audioPlayer.songDuration);
// console.log('Author:', audioPlayer.details.author);


const dbz: string[] = ['Goku', 'Vegeta', 'Trunks'];//Destructuring array
const [goku, vegeta, trunks] = dbz; //destructuring array
const [,,trunks2] = dbz; //destructuring array
const trunk = dbz[2]; //accessing array by index
const [,,,pikolo = 'Pikolo Not Found'] = dbz; //destructuring array

console.log("Goku:", goku);
console.error("Vegeta:", dbz[3] || 'not found');
console.log("Trunks:", trunk);
console.log("Trunks2:", trunks2); 
console.log("Pikolo:", pikolo); 
export { };