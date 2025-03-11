// import express
const express = require('express')
//initizlize the express app
const app = express()

app.use(express.static('public'))

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

let posts = []
app.get('/submit', (request, response) => {
    console.log(request.query)
    posts.push({
        username: request.query.user,
        message: request.query.meaagse,

    })

    response.send("thank you for your submitting," + "<a href=\"\/index.html\">back to home</a>")
})
// app.get('/posts', (req.res)=> {
//     let allPost = ''
//     for (let i = 0; i < posts.length; i++){
//         allPost += posts[i].username + "says" + posts[i].message +"<br />"

//     }
// }

// res.send(allPost)
// })
app.listen(5555, () => {
    console.log('http://127.0.0.1:5555')
})