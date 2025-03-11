// import express
const express = require('express')
//initizlize the express app
const app = express()

app.use(express.static('public'))
app.set("view engine",ejs)

//create first route
app.get('/', (request, response) => {
    response.send('test server is working')
})

//create second route
app.get('/image', (request, response) => {
    response.sendFile('img.png', {
        root: 'public'
    })
})
app.get('/submit',(request,response)=>{
    console.log(request.query)
})

app.get('/template', (req, res) => {
    res.render("template.ejs")
});

app.listen(5555, () => {
    console.log('http://127.0.0.1:5555')
})