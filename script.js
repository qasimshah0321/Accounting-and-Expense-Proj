// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get all menu items
    const menuItems = document.querySelectorAll('.menu-item[data-page]');
    const pageTitle = document.getElementById('page-title');
    const contentDisplay = document.getElementById('content-display');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');

    // Handle menu item clicks
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            menuItems.forEach(menuItem => {
                menuItem.classList.remove('active');
            });

            // Add active class to clicked item
            this.classList.add('active');

            // Get the page name from data attribute
            const pageName = this.getAttribute('data-page');

            // Update page title
            pageTitle.textContent = pageName;

            // Update content display with the menu name
            contentDisplay.innerHTML = `
                <h2>${pageName}</h2>
                <p>You clicked on ${pageName}</p>
            `;

            // Close mobile menu if open
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }

            // Log to console for debugging
            console.log(`Navigated to: ${pageName}`);
        });
    });

    // Handle mobile menu toggle
    mobileMenuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768) {
            const isClickInsideSidebar = sidebar.contains(event.target);
            const isClickOnToggle = mobileMenuToggle.contains(event.target);

            if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        }
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
        }
    });

    // Handle search bar
    const searchInput = document.querySelector('.search-bar input');
    searchInput.addEventListener('focus', function() {
        console.log('Search activated');
    });

    searchInput.addEventListener('input', function(e) {
        console.log('Search query:', e.target.value);
    });

    // Handle create button
    const createBtn = document.querySelector('.create-btn');
    createBtn.addEventListener('click', function() {
        console.log('Create button clicked');
        alert('Create new transaction');
    });

    // Handle icon buttons
    const iconButtons = document.querySelectorAll('.icon-btn');
    iconButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('Icon button clicked');
        });
    });

    console.log('Accounting Software initialized successfully');
});
