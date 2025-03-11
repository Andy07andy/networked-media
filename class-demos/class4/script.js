
window.onload = () => {
    //printing to console of browser
    console.log('page has loaded')
    init()
}

function init(){
    alert('called the init function!')
    document.getElementById('container').style.backgroundColor = "Lightpink"
}