let html5QrCode;

function startScanner() {
    document.getElementById("qr-reader").style.display = "block";
    document.getElementById("qr-result").style.display = "none";
    
    if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
    }
    
    html5QrCode = new Html5Qrcode("qr-reader");
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        // Try to extract UPI ID from the QR code URL
        let upiId = "";
        if (decodedText.startsWith("upi://pay")) {
            const params = new URLSearchParams(decodedText.split('?')[1]);
            upiId = params.get("pa");
        }
        if (upiId) {
            document.getElementById("upiId").value = upiId;
            document.getElementById("qr-result").style.display = "block";
            html5QrCode.stop().then(() => {
                document.getElementById("qr-reader").style.display = "none";
            });
        } else {
            document.getElementById("upiId").value = "";
            document.getElementById("qr-result").style.display = "none";
        }
    };
    
    const config = { fps: 10, qrbox: 250 };
    html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
        .catch(err => {
            document.getElementById("result").innerText = "Camera error: " + err;
        });
}

// Initialize Feather Icons
document.addEventListener('DOMContentLoaded', () => {
    feather.replace();
    
    // Payment form submission
    document.getElementById("payment-form").addEventListener("submit", function(event) {
        event.preventDefault();
        const upiId = document.getElementById("upiId").value;
        const amount = document.getElementById("amount").value;
        const purpose = document.getElementById("purpose").value;

        // Basic validation
        if (!upiId || !amount) {
            document.getElementById("result").innerText = "UPI ID and Amount are required.";
            return;
        }

        document.getElementById("result").innerText = "Processing payment...";
        
        // For demonstration, simulate a successful payment response
        setTimeout(() => {
            document.getElementById("result").innerText = "Payment of ₹" + amount + " to " + upiId + " successful!";
            document.getElementById("payment-form").reset();
        }, 2000);
    });
});