const mongoose= require('mongoose');
require('dotenv').config();

const MONGODB_URL= process.env.MONGODB_URL

mongoose.connect(MONGODB_URL);

mongoose.connection.on('connected',()=>{
    console.log('Connected to Database Successfully')
})

mongoose.connection.on('disconnected',()=>{
    console.log('Failed to Connect the Database')
})
