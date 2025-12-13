// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get all menu items
    const menuItems = document.querySelectorAll('.menu-item[data-page]:not(.has-submenu)');
    const menuItemsWithSubmenu = document.querySelectorAll('.menu-item.has-submenu');
    const submenuItems = document.querySelectorAll('.submenu-item[data-page]');
    const pageTitle = document.getElementById('page-title');
    const contentDisplay = document.getElementById('content-display');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');

    // Handle menu items without submenu clicks
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all menu items and submenu items
            menuItems.forEach(menuItem => {
                menuItem.classList.remove('active');
            });
            submenuItems.forEach(submenuItem => {
                submenuItem.classList.remove('active');
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

    // Handle menu items with submenu clicks (expand/collapse)
    menuItemsWithSubmenu.forEach(item => {
        const menuItemContent = item.querySelector('.menu-item-content');

        menuItemContent.addEventListener('click', function(e) {
            e.stopPropagation();

            // Toggle expanded class
            item.classList.toggle('expanded');

            // Log to console for debugging
            console.log(`Toggled submenu: ${item.getAttribute('data-page')}`);
        });
    });

    // Handle submenu item clicks
    submenuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();

            // Remove active class from all menu items and submenu items
            menuItems.forEach(menuItem => {
                menuItem.classList.remove('active');
            });
            submenuItems.forEach(submenuItem => {
                submenuItem.classList.remove('active');
            });

            // Add active class to clicked submenu item
            this.classList.add('active');

            // Get the page name from data attribute
            const pageName = this.getAttribute('data-page');

            // Update page title
            pageTitle.textContent = pageName;

            // Update content display with the submenu name
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

    // Handle create button - open create menu modal
    const createBtn = document.querySelector('.create-btn');
    const createMenuOverlay = document.getElementById('createMenuOverlay');
    const closeCreateMenu = document.getElementById('closeCreateMenu');
    const createSubmenuItems = document.querySelectorAll('.create-submenu-item');

    createBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        createMenuOverlay.classList.add('active');
        console.log('Create menu opened');
    });

    // Handle close create menu button
    closeCreateMenu.addEventListener('click', function() {
        createMenuOverlay.classList.remove('active');
        console.log('Create menu closed');
    });

    // Close create menu when clicking on overlay
    createMenuOverlay.addEventListener('click', function(e) {
        if (e.target === createMenuOverlay) {
            createMenuOverlay.classList.remove('active');
            console.log('Create menu closed by overlay click');
        }
    });

    // Handle create menu item clicks
    createSubmenuItems.forEach(item => {
        item.addEventListener('click', function() {
            const pageName = this.getAttribute('data-page');

            // Remove active class from all menu items and submenu items
            menuItems.forEach(menuItem => {
                menuItem.classList.remove('active');
            });
            submenuItems.forEach(submenuItem => {
                submenuItem.classList.remove('active');
            });

            // Update page title
            pageTitle.textContent = pageName;

            // Update content display
            contentDisplay.innerHTML = `
                <h2>${pageName}</h2>
                <p>Create new ${pageName}</p>
            `;

            // Close create menu
            createMenuOverlay.classList.remove('active');

            // Close mobile menu if open
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }

            console.log(`Creating new: ${pageName}`);
        });
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
