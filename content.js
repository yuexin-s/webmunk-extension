// --- create box
const box = document.createElement('div');
box.textContent = 'Webmunk Active';
Object.assign(box.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: 'rgba(90, 121, 176, 0.9)',
    color: '#fff',
    padding: '12px 16px',
    borderRadius: '8px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    zIndex: '10000',
});

// --- create close button
const closeBtn = document.createElement('span');
closeBtn.textContent = '×';
Object.assign(closeBtn.style, {
    marginLeft: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
});
closeBtn.onclick = () => {
    box.remove();
    logEvent("close");
};

// --- attach elemtns 
box.appendChild(closeBtn);
document.body.appendChild(box);

// --- logging helper
function logEvent(event){
    const log = {event, ts: new Date().toISOString(), url: window.location.href};
    console.log(log);
}

// Example of automatic event logging:
logEvent("loaded");