const request = require('request');

request.post('https://textbelt.com/text',{
    form:{
        phone:'+916281407118',
        message: 'testing Hello World!',
        key: 'textbelt',
    },
},(err, httpResponse, body)=>{
    console.log(JSON.parse(body));
});

