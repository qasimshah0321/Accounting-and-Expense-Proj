# AccountPro - Next.js Accounting Software

A modern, responsive accounting software frontend built with Next.js, featuring a QuickBooks-inspired design and EasyAccount menu structure.

## Features

- **Modern UI**: Clean, professional interface with QuickBooks-inspired green color scheme
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Menu Navigation**: Easy-to-use sidebar with Dashboard, Sales, Customers, Purchases, Vendors, Reports, and Settings
- **Built with Next.js 14**: Using the latest App Router architecture
- **CSS Modules**: Scoped styling for better maintainability

## Getting Started

### Installation

1. Navigate to the project directory:
```bash
cd nextjs-accounting-app
```

2. Install dependencies:
```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
nextjs-accounting-app/
├── app/
│   ├── layout.js          # Root layout
│   ├── page.js            # Home page
│   ├── page.module.css    # Page styles
│   └── globals.css        # Global styles
├── components/
│   ├── Header.js          # Header component
│   ├── Header.module.css  # Header styles
│   ├── Sidebar.js         # Sidebar component
│   └── Sidebar.module.css # Sidebar styles
├── public/                # Static assets
├── next.config.js         # Next.js configuration
├── jsconfig.json          # JavaScript configuration
└── package.json           # Dependencies
```

## Menu Items

- **Dashboard**: Main overview page
- **Sales**: Sales management
- **Customers**: Customer management
- **Purchases**: Purchase tracking
- **Vendors**: Vendor management
- **Reports**: Reporting and analytics
- **Settings**: Application settings

## Technologies Used

- **Next.js 14**: React framework with App Router
- **React 18**: UI library
- **CSS Modules**: Component-scoped styling
- **Font Awesome**: Icon library

## Customization

### Changing Colors

Edit the CSS variables in `app/globals.css`:

```css
:root {
  --primary-green: #2CA01C;
  --dark-green: #228B14;
  /* ... other colors */
}
```

### Adding New Menu Items

Edit the `menuItems` array in `components/Sidebar.js`:

```javascript
const menuItems = [
  { id: 'new-item', name: 'New Item', icon: 'fa-icon-name' },
  // ... other items
]
```

## License

This project is open source and available for use.
