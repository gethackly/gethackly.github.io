//DARK MODE
function myFunction() {
    var element = document.body;
    element.classList.toggle("dark-mode");
}

//accordion
var acc = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < acc.length; i++) {
acc[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var panel = this.nextElementSibling;
    if (panel.style.maxHeight) {
    panel.style.maxHeight = null;
    } else {
    panel.style.maxHeight = panel.scrollHeight + "px";
    } 
});
}

//COUNTDOWN
var countDownDate = new Date("November 27, 2024 00:00:01").getTime();
var timeClear = setInterval(function() {
var now = new Date().getTime();
var timeLeft = countDownDate - now;

var days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
var hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
var minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
var seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

document.querySelector(".timer").innerHTML =
    days + "d " + hours + "h " + minutes + "m " + seconds + "s ";

if (timeLeft < 0) {
    clearInterval(timeClear);
    document.querySelector(".timer").innerHTML = "Timer Finished";
}
}, 1000);
