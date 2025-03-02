const mongoose=require('mongoose');


const bookmarkSchema =new mongoose.Schema({
    jobId:{type: mongoose.Schema.Types.ObjectId,ref:'Job',required:true},
    userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
    status:{type:Boolean}
    
});

module.exports = mongoose.model('bookmark', bookmarkSchema);

