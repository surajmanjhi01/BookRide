const userSchema = require('./schemas/user.schema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userSchema=new mongoose.Schema({
    fullname:{
        firstname:{type:String,required:true,minlength:[3,'First name must be at least 3 characters long']},
        lastname:{type:String,required:true,minlength:[3,'Last name must be at least 3 characters long']}

    },
    email:{type:String,required:true,unique:true},
    password:{type:String,required:true,minlength:[6,'Password must be at least 6 characters long'],select:false},
    phone:{type:String,required:true,unique:true,minlength:[10,'Phone number must be at least 10 characters long'],maxlength:[10,'Phone number must be at most 10 characters long']},
    socketId:{
        type:String,   
    }
});
userSchema.methods.generateAuthToken=function(){
    const token=jwt.sign({_id:this._id},process.env.JWT_SECRET,{expiresIn:'1h'});
    return token;
}
userSchema.methods.comparePassword=async function(password){
    return await bcrypt.compare(password,this.password);
}
userSchema.static.hashPassword=async function(password){
    return await bcrypt.hash(password,10);
}
const User=mongoose.model('User',userSchema);
module.exports=User;