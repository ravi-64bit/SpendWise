require('dotenv').config();
const dns = require("dns");
dns.setServers([
    "1.1.1.1",
    "8.8.8.8"
]);

const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;

mongoose.connect(uri).then(()=>{
    console.log('Connected to DB');
}).catch((err)=>{
    console.log('Error connecting to Mongo DB : '+err);
});

//transaction schema
const transactionSchema = new mongoose.Schema({
   amount : Number,
   account: Boolean,
   owner: String,
   party: String,
   note: {type:String, default:"No note"},
   mode: Boolean,
   type: Boolean,
   date: {type: Date, default:Date.now}
});
const Transaction = mongoose.model('Transaction', transactionSchema, 'transactions');

// balance schema
const balanceSchema = new mongoose.Schema({
    account: Boolean,
    balance: Number,
    owner: String,
    // month: {type:String, default: Date.getMonth}
});
const Balance = mongoose.model('Balance', balanceSchema, 'balances');

//user schema

const User= mongoose.connection.collection('users');



//export
module.exports = {
    Transaction,
    Balance,
    User
};




