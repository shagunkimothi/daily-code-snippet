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
        const isGuest = localStorage.getItem("isGuest") === "true";

        if (view === 'dashboard') {
            if (!token) {
                alert("Please log in to access Dashboard.");
                return;
            }
            window.location.href = "dashboard.html";
        }

        else if (view === 'calendar') {
            window.location.href = "calendar.html";
        }

        else if (view === 'library') {
            window.location.href = "library.html"; // if you create this
        }

        else if (view === 'favorites') {
            if (!token) {
                alert("Please log in to access Favorites.");
                return;
            }
            window.location.href = "favorites.html";
        }

        else if (view === 'add') {
            if (!token) {
                alert("Please log in to add snippets.");
                return;
            }
            window.location.href = "addnewsnippet.html";
        }
    }

    applyRoleVisibility() {
        const token = localStorage.getItem("token");

        if (!token) {
            // Hide dashboard & favorites for guest
            document.querySelectorAll('[data-view="dashboard"], [data-view="favorites"]')
                .forEach(el => el.style.display = "none");

            if (this.addButton) {
                this.addButton.style.display = "none";
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new Sidebar();
});
