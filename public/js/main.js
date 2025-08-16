// Additional functionality for the room page
document.addEventListener('DOMContentLoaded', () => {
    // Copy room link
    document.getElementById('copy-link').addEventListener('click', () => { // Click event listener 🖱️
        const roomLink = `${window.location.origin}/room/${roomId}`; // Build the room link 🔗
        navigator.clipboard.writeText(roomLink) // Copy to clipboard 📋
            .then(() => {
                alert('Room link copied to clipboard!'); // Show success message ✅
            })
            .catch(err => {
                console.error('Failed to copy: ', err); // Log the error ❌
            });
    });
});