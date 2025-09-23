(function() {
    'use strict';

  
    const antiDebugCheck = () => {
        const minInterval = 100;
        let lastTime = new Date().getTime();
        setInterval(() => {
            const currentTime = new Date().getTime();
            if (currentTime - lastTime > minInterval * 2) {
                while(true) {} 
            }
            debugger;
            lastTime = new Date().getTime();
        }, 50);
    };
    antiDebugCheck();

    const expirationDate = new Date('2026-12-31'); 
    if (new Date() > expirationDate) { return; }
    
    function initializeScript() {
        console.log("Lisanslı script başarıyla çalıştırıldı.");
        
        const moveArmyBtn = document.createElement("button");
        moveArmyBtn.id = "moveArmyBtn";
        moveArmyBtn.textContent = "Orduyu Taşı";
        Object.assign(moveArmyBtn.style, {
            position: "fixed",top: "80px",right: "20px",backgroundColor: "#007bff",color: "white",fontSize: "16px",padding: "10px 20px", zIndex: "9998"
        });

        if (document.getElementById('moveArmyBtn')) {
            document.getElementById('moveArmyBtn').remove();
        }
        document.body.appendChild(moveArmyBtn);
        
        async function sendArmyMoveRequest() {
            const params = new URLSearchParams();
            params.append("xjxfun", "doArmyMove");
            params.append("xjxr", Date.now().toString());
            params.append("xjxargs[]", "SArmyDeployment");
            const armyPayload = String.raw`<xjxobj><e><k>formData</k><v><xjxobj><e><k>army</k><v><xjxobj><e><k>P1</k><v>S</v></e><e><k>S1</k><v>S1</v></e><e><k>M1</k><v>S</v></e><e><k>K1</k><v>S</v></e><e><k>KS</k><v>S</v></e></xjxobj></v></e><e><k>holding</k><v><xjxobj><e><k>2</k><v><xjxobj><e><k>0</k><v>S24595</v></e></xjxobj></v></e></xjxobj></v></e><e><k>button</k><v>S<![CDATA[Move to field]]></v></e></xjxobj></v></e><e><k>moveArmyToGarrison</k><v>Bfalse</v></e><e><k>vexok</k><v>Btrue</v></e></xjxobj>`;
            const mobilePayload = String.raw`<xjxobj><e><k>isMobileView</k><v>Bfalse</v></e></xjxobj>`;
            params.append("xjxargs[]", armyPayload);
            params.append("xjxargs[]", mobilePayload);
            const endpointUrl = "https://www.imperiaonline.org/imperia/game_v6/game/xajax_loader.php";
            try {
                const response = await fetch(endpointUrl, {
                    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "Cookie": document.cookie },
                    body: params.toString()
                });
                if (!response.ok) { throw new Error(`HTTP Hatası! Durum: ${response.status}`); }
                console.log("Ordu taşıma isteği başarıyla gönderildi.");
            } catch (error) { console.error("Ordu taşıma isteği sırasında bir hata oluştu:", error); }
        }
        
        moveArmyBtn.addEventListener("click", sendArmyMoveRequest);
    }

    initializeScript();
})();