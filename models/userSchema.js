const mongoose =requir('mongoose');
const{Schema,ObjectId}= mongoose;

const UserSchema =new Schema({
    UserName:{
        type:String,
        require:true
    },
    Email:{
        type:String,
        require:true
    },
    Password:{
        type:String,
        require:true
    },
    Status:{
        type:String,
        default:'Active'
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
module.exports=User