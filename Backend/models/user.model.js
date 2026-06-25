const mongoose=require('mongoose');
const userschema=new mongoose.Schema({
     name:{type:String,required:true},
     email:{type:String,required:true,unique:true},
     password:{type:String,required:true},
     role:{type:String,required:true,enum:["user","admin"],default:"user"},
     isActive:{type:Boolean,default:true}
},{timestamps:true});

module.exports=mongoose.model("User",userschema);