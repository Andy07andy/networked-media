window.onload = ()=> {
 let b1 = document.getElementById('myBtn')
 b1.addEventListener('click',()=>{
    // console.log('test')
    let div = document.getElementById('change')
    let c = div.classList
    if(c.contains("day")){
        c.remove('day')
        c.add('night')
        b1.textContent = "Lights on"
    }else{
        c.remove('night')
        c.add('day')
        b1.textContent = "Lights off"
    }
 })
 
//  b1.onclick = () => {

//  }

}