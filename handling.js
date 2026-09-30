const {
    Transaction, 
    Balance,
    User}=require('./db.js')

// transaction ops

async function addTransaction(amount, account, owner, party, note, mode, type){
    const transaction = new Transaction({ amount, account, owner, party, note, mode, type });
    await transaction.save(); // let it throw — don't swallow

    let bal = await getBalance(account, owner);
    if(!bal){
        bal = await Balance.create({ account, owner, balance: 0 });
    }
    const newBalance = type == 0 ? bal.balance - Number(amount) : bal.balance + Number(amount);
    await updateBalance(account, owner, newBalance);
}


async function getTransactions(account, owner){
    const transactions = await Transaction.find({ account: account, owner:owner }).sort({ date: -1 });
    return transactions;
}



// balance ops

async function getBalance(account, owner){
    return await Balance.findOne({account:account,owner:owner});
}

async function getAllBalances(owner){
    const general = await Balance.findOne({account:0, owner:owner});
    const personal= await Balance.findOne({account:1, owner:owner});
    return{
        generalAccountBalance: general ? general.balance : 0,
        personalAccountBalance: personal ? personal.balance : 0
    }

}

async function updateBalance(account, owner, newBalance){
    return await Balance.findOneAndUpdate({
        account:account,
        owner:owner}, {balance: newBalance}, {new: true});
}


//user validation

async function checkPassword(userName,password){
   try {
     const realPassword =await User.findOne({username:userName});
     if(realPassword.password == password && realPassword.username == userName){
         return true;
     }
     else{
         return false;
     }
   } catch (error) {
        return false;
   }
}

//other ops

function requireAuth (req, res, next){
    const authCookie = req.signedCookies.auth_session;
    if(authCookie){
        return next();
    }
    res.redirect('/login');
}

function makeLink(amount, upiId, note){
    link = "upi://pay?pa=" + upiId + "&pn=YourName&am=" + amount + "&cu=INR" + "&tn=" + note;
    return link;
}


//exports
module.exports = {
    makeLink,
    requireAuth,
    addTransaction,
    getTransactions,
    checkPassword,
    getBalance,
    getAllBalances
}


