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

console.log('Volume:', audioVolume);
// console.log('Song:', anotherSong);   
console.log('Song:', song);     
console.log('Duration:', songDuration);
console.log('Author:', details.author);

// const {   } = audioPlayer
// console.log('Song:', audioPlayer.song);
// console.log('Duration:', audioPlayer.songDuration);
// console.log('Author:', audioPlayer.details.author);