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
var countDownDate = new Date("December 27, 2024 16:00:01").getTime();
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

// Modal functionality
const modal = document.getElementById("collaborationModal");
const modalTrigger = document.querySelector(".modal-trigger");
const closeBtn = document.querySelector(".closeModalBtn");
const modalContent = document.querySelector(".modal-content");

modalTrigger.addEventListener("click", function(e) {
    e.preventDefault();
    modal.style.display = "block";
    document.body.classList.add("modal-open");
    // Reset scroll position
    modalContent.classList.remove("scrolled");
});

closeBtn.addEventListener("click", function() {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
});

window.addEventListener("click", function(e) {
    if (e.target == modal) {
        modal.style.display = "none";
        document.body.classList.remove("modal-open");
    }
});

// Handle modal scroll animation
modal.addEventListener("scroll", function() {
    if (modal.scrollTop > 20) {
        modalContent.classList.add("scrolled");
    } else {
        modalContent.classList.remove("scrolled");
    }
});

// Tab functionality
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and panes
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Add active class to clicked button and corresponding pane
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

// Toggle functionality
const toggleButtons = document.querySelectorAll('.toggle-button');
const togglePanes = document.querySelectorAll('.toggle-pane');
const featureTexts = document.querySelectorAll('.feature-text');

toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and panes
        toggleButtons.forEach(btn => btn.classList.remove('active'));
        togglePanes.forEach(pane => pane.classList.remove('active'));
        featureTexts.forEach(text => text.classList.remove('active'));
        
        // Add active class to clicked button and corresponding panes
        button.classList.add('active');
        const toggleId = button.getAttribute('data-toggle');
        document.getElementById(toggleId).classList.add('active');
        
        // Show corresponding feature texts
        document.querySelectorAll(`.feature-text[data-toggle="${toggleId}"]`).forEach(text => {
            text.classList.add('active');
        });
    });
});