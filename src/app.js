import express from 'express'
import cros from 'cros'
import cookieParser from 'cookie-parser'

const app = express() 

app.use(cos({
    origin:process.env.CORS_ORIGIN,
    Credential:true
}))


app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser()) 


export {app}
