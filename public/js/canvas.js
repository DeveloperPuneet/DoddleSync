// Canvas drawing logic
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('drawingCanvas'); // Get canvas element 🖼️
    const ctx = canvas.getContext('2d'); // Get drawing context 🖌️
    const socket = io(); // Initialize socket.io client 🔌
    
    // Set canvas to full size of container
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth; // Set width
        canvas.height = canvas.offsetHeight; // Set height
    }
    
    window.addEventListener('resize', resizeCanvas); // Resize on window 🔄
    resizeCanvas(); // Initial canvas resize
    
    // Drawing state
    let drawing = false; // Is drawing active? ✍️
    let currentTool = 'pencil'; // Current selected tool 🛠️
    let currentColor = '#000000'; // Current selected color 🎨
    let currentSize = 3; // Current brush size 📏
    let startX = 0; // Start X coordinate
    let startY = 0; // Start Y coordinate
    
    // Setup canvas
    ctx.lineJoin = 'round'; // Set line join style
    ctx.lineCap = 'round'; // Set line cap style
    ctx.strokeStyle = currentColor; // Set initial stroke style
    ctx.lineWidth = currentSize; // Set initial line width
    
    // Tool selection
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.dataset.tool; // Update current tool
        });
    });
    
    // Color selection
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentColor = btn.dataset.color; // Update current color
            document.getElementById('color-picker').value = btn.dataset.color;
        });
    });
    
    document.getElementById('color-picker').addEventListener('input', (e) => {
        currentColor = e.target.value; // Update color from picker
    });
    
    // Size selection
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSize = parseInt(btn.dataset.size); // Parse size to int
        });
    });
    
    // Canvas functions
    function startDrawing(e) {
        drawing = true; // Start drawing flag
        const pos = getMousePos(canvas, e);
        [startX, startY] = [pos.x, pos.y]; // Store start position
        
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
        
        ctx.strokeStyle = currentColor; // Set stroke color
        ctx.lineWidth = currentSize; // Set line width
        
        switch(currentTool) {
            case 'pencil':
            case 'brush':
            case 'eraser':
                if (currentTool === 'eraser') {
                    ctx.strokeStyle = '#1e1e1e'; // Eraser color is bg
                }
                ctx.beginPath(); // Start new path
                ctx.moveTo(startX, startY); // Move to start
                ctx.lineTo(x, y); // Draw line to point
                ctx.stroke(); // Actually draw the line
                
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
                
                [startX, startY] = [x, y]; // Update start position
                break;
                
            case 'line':
                redrawCanvas(); // Redraw the canvas
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
        ctx.font = `${currentSize * 5}px Arial`; // Set text font
        ctx.fillStyle = currentColor; // Set text color
        ctx.fillText(text, x, y); // Draw the text
    }
    
    function stopDrawing() {
        if (!drawing) return;
        drawing = false; // Stop drawing
    }
    
    function getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left, // Calculate mouse X pos
            y: evt.clientY - rect.top // Calculate mouse Y pos
        };
    }
    
    function redrawCanvas() {
        // In a real app, we would redraw all stored drawing commands
    }
    
    // Clear canvas
    document.getElementById('clear-canvas').addEventListener('click', () => {
        ctx.fillStyle = '#1e1e1e'; // Fill with background color
        ctx.fillRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        
        if (roomId) {
            socket.emit('clearCanvas', roomId);
        }
    });
    
    // Save canvas
    document.getElementById('save-canvas').addEventListener('click', () => {
        const dataUrl = canvas.toDataURL('image/png'); // Get data URL
        const link = document.createElement('a'); // Create link element
        link.download = 'doodlesync-drawing.png'; // Set download name
        link.href = dataUrl; // Set data URL
        link.click(); // Simulate a click
    });
    
    // Socket listeners for remote drawing
    socket.on('draw', (data) => {
        ctx.strokeStyle = data.color; // Set remote color
        ctx.lineWidth = data.size; // Set remote line width
        
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
        ctx.fillStyle = '#1e1e1e'; // Set background color
        ctx.fillRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    });
    
    // Event listeners
    canvas.addEventListener('mousedown', startDrawing); // Start drawing
    canvas.addEventListener('mousemove', draw); // While mouse moving
    canvas.addEventListener('mouseup', stopDrawing); // Stop drawing
    canvas.addEventListener('mouseout', stopDrawing); // Stop drawing
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouchStart); // Handle touch start
    canvas.addEventListener('touchmove', handleTouchMove); // Handle touch move
    canvas.addEventListener('touchend', handleTouchEnd); // Handle touch end
    
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
        window.location.href = '/'; // Redirect to homepage
    });
});