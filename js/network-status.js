/**
 * Network Status Monitor
 * Detects slow internet connection or offline status and notifies the user.
 */

(function() {
    // Create the notification element
    const notification = document.createElement('div');
    notification.id = 'network-status-notification';
    notification.innerHTML = `
        <div class="icon"><i class="fas fa-wifi"></i></div>
        <div class="message">Your internet connection seems slow.</div>
        <button class="close-btn" aria-label="Close notification">&times;</button>
    `;
    document.body.appendChild(notification);

    const closeBtn = notification.querySelector('.close-btn');
    const messageNode = notification.querySelector('.message');
    const iconNode = notification.querySelector('.icon i');

    closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
    });

    function updateStatus() {
        const isOnline = navigator.onLine;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        let showMessage = false;
        let messageText = "";
        let isOffline = false;

        if (!isOnline) {
            showMessage = true;
            messageText = "You are currently offline. Check your connection.";
            isOffline = true;
        } else if (connection) {
            // Effective types: 'slow-2g', '2g', '3g', '4g'
            if (['slow-2g', '2g', '3g'].includes(connection.effectiveType)) {
                showMessage = true;
                messageText = "Weak internet connection detected. Media might load slowly.";
            }
        }

        if (showMessage) {
            messageNode.textContent = messageText;
            notification.classList.toggle('offline', isOffline);
            iconNode.className = isOffline ? 'fas fa-plane' : 'fas fa-wifi';
            notification.classList.add('show');
        } else {
            notification.classList.remove('show');
        }
    }

    // Initial check
    updateStatus();

    // Listen for changes
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
        connection.addEventListener('change', updateStatus);
    }

    // Periodic check as fallback for connection speed
    setInterval(updateStatus, 10000);
})();
