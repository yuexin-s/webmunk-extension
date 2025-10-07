const box = document.createElement('div');
box.textContent = 'Hello from Webmunk!';
Object.assign(box.style, {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '8px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    zIndex: '10000',
});
document.body.appendChild(box)