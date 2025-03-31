window.onload = () => {
    document.getElementById('submit').addEventListener("click", search);
}

async function search() {
    console.log("clicked");

    const inputText = document.getElementById("textInput").value;

    const params = new URLSearchParams({
        apikey: "9aa8e798",
        s: inputText,
        type: "movie"
    });

    let url = "http://www.omdbapi.com/?" + params; // Added 'www.'

    try {
        let response = await fetch(url);

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        let jsonResponse = await response.json();

        success(jsonResponse);

    } catch (err) {
        console.error("Error fetching movie data:", err);
    }
}

function success(response) {
    console.log(response);
    
    if (!response.Search) {
        console.log("No movies found");
        return;
    }

    let moviesContainer = document.getElementById("movies");
    moviesContainer.innerHTML = ""; // Clear previous results

    let movies = response.Search;

    for (let movie of movies) {
        let newElement = document.createElement('div');
        newElement.textContent = movie.Title;

        let img = document.createElement('img');
        img.src = movie.Poster;
        img.alt = movie.Title;
        img.style.width = "100px"; // Small thumbnail

        newElement.appendChild(img);
        moviesContainer.appendChild(newElement);
    }
}
