const mongoose =require('mongoose');
const{Schema,ObjectId}= mongoose;

const UserSchema =new Schema({
    Name:{
        type:String,
        require:true
    },
    
    email:{
        type:String,
        require:true
    },
    password:{
        type:String,
        require:true
    },
    Status:{
        type:String,
        default:'Active'
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    cart: {
        type: Array
    },
    Address: [{
        Name: {
            type: String
        },
        AddressLane: {
            type: String
        },
        City: {
            type: String
        },
        Pincode: {
            type: Number
        },
        State: {
            type: String
        },
        Mobile: {
            type: Number
        }
    }]
})

const User= mongoose.model('User',UserSchema);
module.exports=User;