var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// if you dont specify types is asigned any like default
function suma(v1, v2) {
    return v1 + v2;
}
suma(10, 10);
// first you need specify requered parameters and after that all optional parameters
function optional(required, optional) {
    return required + optional;
}
//
function constant(constant, optional) {
    if (constant === void 0) { constant = "Value"; }
    return constant + optional;
}
// only we can return undefined if use void
function returvoid(constant, optional) {
    if (constant === void 0) { constant = "Value"; }
    return undefined;
}
// only in funcions that never finish
// function returnever(): never {
// }
//console.log(returvoid())
var Video = /** @class */ (function () {
    //Constructor, only exists one constructor into a class
    //no return 
    function Video(title) {
        this.title = title;
    }
    Video.prototype.printTitle = function () {
        console.log(this.title);
    };
    Video.prototype.changeTitle = function (title) {
        this.title = title;
    };
    Video.prototype.getTitle = function () { return this.title; };
    Video.prototype.play = function () { console.log('Playing'); };
    Video.prototype.stop = function () { console.log('Stoppig'); };
    return Video;
}());
var YouTubeVideo = /** @class */ (function (_super) {
    __extends(YouTubeVideo, _super);
    function YouTubeVideo() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return YouTubeVideo;
}(Video));
var miVideo = new Video('mi title');
miVideo.printTitle();
miVideo.changeTitle('Change mi title');
console.log(miVideo.getTitle());
console.log(miVideo.play());
console.log(miVideo.stop());
