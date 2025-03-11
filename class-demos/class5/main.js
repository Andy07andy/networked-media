let seconds = 0;
const colors = ["red", "blue", "yellow", "green", "purple"];

window.onload = () => {
    // Create elements and add to page
    for (let i = 0; i < 50; i++) { // step1:
        const span = document.createElement("span");
        const node = document.createTextNode("created! " + i);
        
        // step2:
        span.appendChild(node);
        span.classList.add("text-body");
        span.style.backgroundColor = randomColor(colors);
        
        // step3:
        document.body.appendChild(span);
    }

    // 2 parameters:
    // 1. function (action) to be executed
    // 2. time that requires to pass before that function is executed (in ms)
    setInterval(time, 1000);
};

function time() {
    // console.log(seconds + ' second has passed')
    // seconds++

    const date = new Date();
    console.log(date.toLocaleTimeString());
    
    let allSpans = document.getElementsByClassName("text-body");
    for (let i = 0; i < allSpans.length; i++) {
        allSpans[i].textContent = date.toLocaleTimeString();
    }
}

// Helper function for random color generation
function randomColor(arr) {
    let index = Math.floor(Math.random() * arr.length);
    return arr[index]; // Corrected syntax
}
