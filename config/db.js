const mongoose = require('mongoose');

module.exports.connectToMongoDB = async () => {
    mongoose.set('strictQuery', false);

    mongoose.connect(process.env.Url_mongo)
        .then(() => {
            console.log("Connected to MongoDB successfully");
        })
        .catch((error) => {
            console.error("Error connecting to MongoDB:", error);
        });
};
 //najjaaali3
 //yVigtMwkavRjmjK3
 