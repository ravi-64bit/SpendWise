document.addEventListener("DOMContentLoaded",()=>{
    const startBtn = document.getElementById('startReader');
    const reader=document.getElementById('qr-reader');

    if (!startBtn || !reader) return;

    const qrCode= new Html5Qrcode("qr-reader");
    startBtn.addEventListener('click', ()=>{
        reader.style.display='block';
        console.log ('clicked qr');   //remove
        qrCode.start(
            {facingMode:"environment"},
            {fps:10, qrbox:{width:250, height:250}},
            (decodedText)=>{
                console.log(decodedText);    //remove
                let upiParams=stripUpiId(decodedText);
                if(!upiParams){
                    return;
                }
                qrCode.stop().then(()=>{
                    reader.style.display = 'none';
                    window.location.href=`/pay?upiId=${encodeURIComponent(upiParams.upiId)}&amount=${encodeURIComponent(upiParams.amount ?? '')}`;
                });
            },
            (error)=>{
                //ignore error
            }
        ).catch(err => {
            alert("camera access failed! : "+ err);
        });
    });
});

function stripUpiId (rawUrl){
    try {
        let url=new URL(rawUrl);
        
        let params={
            upiId : url.searchParams.get('pa'),
            amount : url.searchParams.get('am') 
        }
        return params
    } catch{
        return null;
    }
}
