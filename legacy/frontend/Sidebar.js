class Sidebar {
    constructor() {
        this.navItems = document.querySelectorAll('.nav-item');
        this.addButton = document.querySelector('.add-snippet-btn');
        this.init();
    }

    init() {
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.navigate(view);
            });
        });

        if (this.addButton) {
            this.addButton.addEventListener('click', () => {
                this.navigate('add');
            });
        }

        this.applyRoleVisibility();
    }

    navigate(view) {
        const token = localStorage.getItem("token");

        if (view === 'dashboard') {
            window.location.href = "dashboard.html";
        }
        else if (view === 'calendar') {
            window.location.href = "calendar.html";
        }
        else if (view === 'favorites') {
            window.location.href = "favorites.html";
        }
        else if (view === 'add') {
            window.location.href = "addnewsnippet.html";
        }
        else if (view === 'library') {
            window.location.href = "index.html";
        }
    }

    applyRoleVisibility() {
        const token = localStorage.getItem("token");

        if (token) {
            // LOGGED IN — show everything
            document.querySelectorAll('[data-view="dashboard"], [data-view="favorites"]')
                .forEach(el => el.style.display = "");
            if (this.addButton) this.addButton.style.display = "";
        } else {
            // GUEST — hide Dashboard, Favorites, Add Snippet. Show only Calendar
            document.querySelectorAll('[data-view="dashboard"], [data-view="favorites"]')
                .forEach(el => el.style.display = "none");
            if (this.addButton) this.addButton.style.display = "none";
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Save Google OAuth token from URL BEFORE sidebar initializes
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    if (urlToken) {
        localStorage.setItem("token", urlToken);
        localStorage.removeItem("isGuest");
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    new Sidebar();
});