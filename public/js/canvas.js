// Canvas drawing logic
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const socket = io();
    
    // Set canvas to full size of container
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Drawing state
    let drawing = false;
    let currentTool = 'pencil';
    let currentColor = '#000000';
    let currentSize = 3;
    let startX = 0;
    let startY = 0;
    
    // Setup canvas
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    
    // Tool selection
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
        });
    });
    
    // Color selection
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentColor = btn.dataset.color;
            document.getElementById('color-picker').value = btn.dataset.color;
        });
    });
    
    document.getElementById('color-picker').addEventListener('input', (e) => {
        currentColor = e.target.value;
    });
    
    // Size selection
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSize = parseInt(btn.dataset.size);
        });
    });
    
    // Canvas functions
    function startDrawing(e) {
        drawing = true;
        const pos = getMousePos(canvas, e);
        [startX, startY] = [pos.x, pos.y];
        
        if (currentTool === 'text') {
            const text = prompt('Enter text:');
            if (text) {
                drawText(startX, startY, text);
                if (roomId) {
                    socket.emit('draw', {
                        type: 'text',
                        roomId: roomId,
                        x: startX,
                        y: startY,
                        text: text,
                        color: currentColor,
                        size: currentSize
                    });
                }
            }
        }
    }
    
    function draw(e) {
        if (!drawing) return;
        
        const pos = getMousePos(canvas, e);
        const x = pos.x;
        const y = pos.y;
        
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentSize;
        
        switch(currentTool) {
            case 'pencil':
            case 'brush':
            case 'eraser':
                if (currentTool === 'eraser') {
                    ctx.strokeStyle = '#1e1e1e';
                }
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(x, y);
                ctx.stroke();
                
                if (roomId) {
                    socket.emit('draw', {
                        type: 'draw',
                        roomId: roomId,
                        tool: currentTool,
                        startX: startX,
                        startY: startY,
                        endX: x,
                        endY: y,
                        color: currentColor,
                        size: currentSize
                    });
                }
                
                [startX, startY] = [x, y];
                break;
                
            case 'line':
                redrawCanvas();
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(x, y);
                ctx.stroke();
                break;
                
            case 'rectangle':
                redrawCanvas();
                ctx.strokeRect(startX, startY, x - startX, y - startY);
                break;
                
            case 'circle':
                redrawCanvas();
                const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
                ctx.beginPath();
                ctx.arc(startX, startY, radius, 0, Math.PI * 2);
                ctx.stroke();
                break;
        }
    }
    
    function drawText(x, y, text) {
        ctx.font = `${currentSize * 5}px Arial`;
        ctx.fillStyle = currentColor;
        ctx.fillText(text, x, y);
    }
    
    function stopDrawing() {
        if (!drawing) return;
        drawing = false;
    }
    
    function getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }
    
    function redrawCanvas() {
        // In a real app, we would redraw all stored drawing commands
    }
    
    // Clear canvas
    document.getElementById('clear-canvas').addEventListener('click', () => {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (roomId) {
            socket.emit('clearCanvas', roomId);
        }
    });
    
    // Save canvas
    document.getElementById('save-canvas').addEventListener('click', () => {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'doodlesync-drawing.png';
        link.href = dataUrl;
        link.click();
    });
    
    // Socket listeners for remote drawing
    socket.on('draw', (data) => {
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        
        if (data.type === 'text') {
            ctx.font = `${data.size * 5}px Arial`;
            ctx.fillStyle = data.color;
            ctx.fillText(data.text, data.x, data.y);
        } else {
            switch(data.tool) {
                case 'pencil':
                case 'brush':
                case 'eraser':
                    if (data.tool === 'eraser') {
                        ctx.strokeStyle = '#1e1e1e';
                    }
                    ctx.beginPath();
                    ctx.moveTo(data.startX, data.startY);
                    ctx.lineTo(data.endX, data.endY);
                    ctx.stroke();
                    break;
                    
                case 'line':
                    ctx.beginPath();
                    ctx.moveTo(data.startX, data.startY);
                    ctx.lineTo(data.endX, data.endY);
                    ctx.stroke();
                    break;
                    
                case 'rectangle':
                    ctx.strokeRect(data.startX, data.startY, data.endX - data.startX, data.endY - data.startY);
                    break;
                    
                case 'circle':
                    const radius = Math.sqrt(Math.pow(data.endX - data.startX, 2) + Math.pow(data.endY - data.startY, 2));
                    ctx.beginPath();
                    ctx.arc(data.startX, data.startY, radius, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
            }
        }
    });
    
    socket.on('clearCanvas', () => {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
    
    // Event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    function handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }
    
    function handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }
    
    function handleTouchEnd(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
    }
    
    // Lock room functionality
    document.getElementById('lock-room-btn').addEventListener('click', () => {
        const btn = document.getElementById('lock-room-btn');
        if (btn.textContent.includes('Lock')) {
            btn.innerHTML = '<i class="icon">🔓</i> Unlock Room';
            btn.classList.remove('btn-outline');
            btn.classList.add('btn-warning');
        } else {
            btn.innerHTML = '<i class="icon">🔒</i> Lock Room';
            btn.classList.add('btn-outline');
            btn.classList.remove('btn-warning');
        }
    });
    
    // Leave room
    document.getElementById('leave-room-btn').addEventListener('click', () => {
        window.location.href = '/';
    });
});