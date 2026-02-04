document.querySelector(".search-container input").addEventListener("focus", function() {
    this.style.borderColor = "#007bff";
});
document.querySelector(".search-container input").addEventListener("blur", function() {
    this.style.borderColor = "#ccc";
});
