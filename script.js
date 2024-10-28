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

//modal
        // Sélectionne tous les boutons qui ouvrent le modal
        document.querySelectorAll(".openModalBtn").forEach(btn => {
            btn.addEventListener("click", function() {
                // Affiche le modal
                document.querySelector(".modal").style.display = "block";
                // Ajoute la classe pour empêcher le défilement du fond
                document.body.classList.add("modal-open");
            });
        });

        // Sélectionne tous les boutons de fermeture dans le modal
        document.querySelectorAll(".closeModalBtn").forEach(btn => {
            btn.addEventListener("click", function() {
                // Masque le modal
                document.querySelector(".modal").style.display = "none";
                // Retire la classe pour permettre le défilement
                document.body.classList.remove("modal-open");
            });
        });

        // Ferme le modal si l'utilisateur clique en dehors du contenu du modal
        window.addEventListener("click", function(event) {
            const modal = document.querySelector(".modal");
            if (event.target === modal) {
                modal.style.display = "none";
                document.body.classList.remove("modal-open");
            }
        });
