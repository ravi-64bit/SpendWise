const express=require('express');
const bodyParser=require('body-parser');
const cookieParser = require('cookie-parser');
const {
    makeLink,
    requireAuth,
    addTransaction,
    getTransactions,
    getBalance,
    getAllBalances,
    updateBalance
} = require('./handling.js');

const asyncHandler = require ('./asyncHandler.js');
const { registerExpressWebhook } = require('node-telegram-bot-api');

// app configs

const app=express();
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('public'));
app.use(cookieParser(process.env.COOKIE_SECRET))

app.use((req,res,next)=>{
    res.locals.currentPath= req.path;
    next();
});

app.use((err, req, res, next)=>{
    console.error(err);

    if (req.accepts('html')){
        res.status(500).send('something wrong please try again!');
    }
    else{
        res.status(500).json({error: 'something wrong!'});
    }
});

// index
app.get('/',requireAuth,asyncHandler(async (req,res)=>{
    const user = req.signedCookies.auth_session;
    const {generalAccountBalance, personalAccountBalance}  = await getAllBalances(user); 
    res.render('index', {generalAccountBalance, personalAccountBalance});
}));

// UPI payments
app.get('/pay',requireAuth,(req,res)=>{
    const upiId=req.query.upiId || '';
    const amount=req.query.amount || '';
    res.render('pay', {upiId, amount, title:'Pay'});
});

app.post('/pay',requireAuth, asyncHandler( async (req,res)=>{
    try{
        const {amount, upiId, note} = req.body;
        const account=req.body.account === '1';
        const targetUrl = makeLink(amount, upiId, note);
        const user=req.signedCookies.auth_session;
        await addTransaction(amount, account, user, upiId, note, 0, 0);
        res.redirect(targetUrl);
    } catch (err){
        console.log(err);
        res.status(500).send("couldn't save transaction!");
    }
}));

// other transactions
app.get('/addTransaction', requireAuth, asyncHandler( async (req,res)=>{
    res.render('addTransaction',{title:'Add cash Transaction'});
}));

app.post('/addTransaction', requireAuth,asyncHandler(async (req,res)=>{
    const{amount, description, note} = req.body;
    const account=req.body.account === "1";
    const mode = req.body.mode === "1";
    const user=req.signedCookies.auth_session;
    const result = await addTransaction(amount, account, user, description, note, mode, 0);
    console.log(result);
    res.redirect('/');
})); 

// add income transactions
app.get('/addIncome', requireAuth, (req,res)=>{
    res.render ('addIncome', {title:'Add Income'});
});

app.post('/addIncome', requireAuth,asyncHandler(async (req,res)=>{
    const {amount, from, note} = req.body;
    const account = req.body.account === "1";
    const mode=req.body.mode === "1";
    const user=req.signedCookies.auth_session;
    const result = await addTransaction(amount, account, user, from, note, mode, 1);
    //console.log(result);
    res.redirect('/');
}));

//transaction lists
app.get('/transactions',requireAuth,asyncHandler( async (req,res)=>{
    res.render('transactions',{title:'transactions'});
}));

app.post('/transactions', requireAuth,asyncHandler( async(req,res)=>{
    let account=req.body.account === "1";
    let user=req.signedCookies.auth_session;
    let transactionList=await getTransactions(account, user);
    let balance = await getBalance(account, user);
    res.render('transactions',{title:'transactions', 
                                transactions:transactionList, 
                                accountType: account==0 ? 'General Account' : 'Personal Account', 
                                balance: balance ? balance : 0});
}));

//update Balance

app.get('/updateBalance', requireAuth, asyncHandler(async(req,res)=>{
    const user =  req.signedCookies.auth_session;
    const {personalAccountBalance, generalAccountBalance} = await getAllBalances(user);

    res.render('updateBalance', {generalAccountBalance, personalAccountBalance, totalBalance: generalAccountBalance+personalAccountBalance});

}));

app.post('/updateBalance', requireAuth, asyncHandler(async(req,res)=>{
    let account = req.body.account === "1";
    let {newBalance} = req.body;
    let user = req.signedCookies.auth_session;
    await updateBalance(account, user, newBalance);
    res.redirect('/');
}));



// login and session
app.get('/login',(req,res)=>{
    res.render('login',{title:'Login'});
});

app.post('/login',(req,res)=>{
    
    const passPhrase=req.body.passPhrase;
    if(passPhrase==process.env.PHRASE_1){
        res.cookie("auth_session", "ravi",{
            httpOnly: true,
            signed: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            secure: false
        });
        return res.redirect('/');
    }

    if (passPhrase == process.env.PHRASE_2){
        res.cookie("auth_session", "other",{
            httpOnly: true,
            signed: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            secure: false
        });
        return res.redirect('/')
    }
    res.status(401).send('invalid passphrase <a href="/login"> try again </a>');
});


app.get('/logout', requireAuth, asyncHandler(async (req,res)=>{
    res.clearCookie('auth_session');
    res.redirect('/login')
}));


//port
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
    console.log('Server is running on port'+ PORT);
});

module.exports = app