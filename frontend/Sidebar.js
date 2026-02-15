// Sidebar component logic
class Sidebar {
    constructor() {
        this.currentView = 'dashboard';
        this.navItems = document.querySelectorAll('.nav-item');
        this.addButton = document.querySelector('.add-snippet-btn');
        
        this.init();
    }

    init() {
        // Add click listeners to navigation items
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.handleViewChange(view);
            });
        });

        // Add click listener to add snippet button
        if (this.addButton) {
            this.addButton.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.handleViewChange(view);
            });
        }
    }

    handleViewChange(view) {
        // Update current view
        this.currentView = view;

        // Remove active class from all nav items
        this.navItems.forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to clicked item
        const activeItem = document.querySelector(`[data-view="${view}"]`);
        if (activeItem && activeItem.classList.contains('nav-item')) {
            activeItem.classList.add('active');
        }

        // Call the view change callback
        this.onViewChange(view);
    }

    onViewChange(view) {
        // This is where you would handle view changes in your app
        console.log(`View changed to: ${view}`);
        
        // Dispatch a custom event that other parts of your app can listen to
        const event = new CustomEvent('viewchange', { 
            detail: { view: view } 
        });
        document.dispatchEvent(event);
    }

    setCurrentView(view) {
        this.handleViewChange(view);
    }

    getCurrentView() {
        return this.currentView;
    }
}

// Initialize the sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = new Sidebar();

    // Example: Listen for view changes
    document.addEventListener('viewchange', (e) => {
        console.log('View changed event received:', e.detail.view);
        // You can add your own logic here to handle view changes
    });

    // Make sidebar instance globally accessible if needed
    window.sidebar = sidebar;
});