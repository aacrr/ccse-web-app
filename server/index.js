const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser') //Form posts
const router = require('./routes/router')
const mongoose = require('mongoose')
const schemas = require('./models/schema')
const cookieParser = require('cookie-parser')
const fs = require('fs')
const https = require('https')

require('dotenv/config')

const app = express()

app.use(bodyParser.json())
app.use(cookieParser())
app.use(bodyParser.urlencoded({extended: false}))
app.use(cors({origin:'https://localhost:3000', credentials:true, optionsSuccessStatus: 200}))
app.use('/', router)


mongoose.connect(process.env.DB_URI, {
    tls: true,
    tlsAllowInvalidCertificates: false
})
.then(() => console.log("Database has connected successfully"))

const privateKey = fs.readFileSync('cert/key.pem', 'utf8')
const certificate = fs.readFileSync('cert/cert.pem', 'utf8')


const serverPort = process.env.PORT // Hides port number used
const server = https.createServer({key: privateKey, cert: certificate}, app)
server.listen(serverPort, () => {
    console.log(`Server is running on port ${serverPort}`)
})

/*
const server = app.listen(serverPort, () => {
    console.log(`Server is running on port ${serverPort}`)
})
    */
