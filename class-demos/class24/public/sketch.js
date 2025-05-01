let mySketch = new p((s)=>{
    s.setup = () =>{
       s.createCanvas(500,500)
    }
    s.draw = () =>{
        s.background('lightblue')
    }
},"mysketch")