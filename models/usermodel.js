const mongoose = require('mongoose')
const bcypt = require('bcrypt')

const userSchema = new mongoose.Schema({
    username: String,
    password: {
        type: String,
        required: true,
        minlength: 6 // Minimum length for password
    },
    email: {type : String , unique: true, required: true 
        // Validate email format
        , match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    role : {
        type: String,
        enum: ['admin', 'client'],
        default: 'client'
    },
    image_user: {
        type: String,
    },
    age : Number,

    status : {type :Boolean, default: false}, // Default value for status
    isDeleted : {type :Boolean ,default: false}, // Default value for isDeleted
    isBlocked : {type :Boolean ,default: false} 
}, {
    timestamps: true // Automatically manage createdAt and updatedAt fields 

});
 
userSchema.pre('save', async function(next) {
 try {
     const salt = await bcypt.genSalt(10);
     this.password = await bcypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});
const User = mongoose.model('User', userSchema);
module.exports = User;


