// Additional functionality for the room page
document.addEventListener('DOMContentLoaded', () => {
    // Copy room link
    document.getElementById('copy-link').addEventListener('click', () => {
        const roomLink = `${window.location.origin}/room/${roomId}`;
        navigator.clipboard.writeText(roomLink)
            .then(() => {
                alert('Room link copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    });
});