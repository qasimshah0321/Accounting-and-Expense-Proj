# Design System - Component Sizing Guidelines

This document defines the standard sizes for form components used throughout the accounting application.

## Component Size Specifications

| Component | Height | Width (Recommended) | CSS Variable | Notes |
|-----------|--------|---------------------|--------------|-------|
| **Text Input (Default)** | 40px | 240–320px | `--input-width-default` to `--input-width-default-max` | Names, references, codes |
| **Text Input (Short)** | 40px | 120–150px | `--input-width-short` to `--input-width-short-max` | Qty, %, Tax |
| **Text Input (Medium)** | 40px | 180–240px | `--input-width-medium` to `--input-width-medium-max` | Date, Price |
| **Text Input (Long)** | 40px | 300–400px | `--input-width-long` to `--input-width-long-max` | Customer, Vendor |
| **Full-width Input** | 40px | 100% (max 600–900px) | `width: 100%; max-width: 900px` | Description, Address |
| **Dropdown / Select** | 40px | 240–320px | `--select-width-default` to `--select-width-default-max` | Vendor, Account, Status |
| **Dropdown (Short)** | 40px | 150–180px | `--select-width-short` to `--select-width-short-max` | Currency, Unit |
| **Multi-select Dropdown** | 40px | 300–400px | `--input-width-long` to `--input-width-long-max` | Tags, Categories |
| **Textarea (Notes / Memo)** | 80–160px | 600–900px | `--textarea-height-min` to `--textarea-height-max` | Internal notes |
| **Table Inline Input** | 32px | 80–160px | `--table-input-width-min` to `--table-input-width-max` | Invoice / PO line items |
| **Table Inline Dropdown** | 32px | 120–180px | `--table-select-width-min` to `--table-select-width-max` | Account, Tax code |
| **Date Picker** | 40px | 180–220px | `--datepicker-width` to `--datepicker-width-max` | Accounting periods |
| **Search Field** | 40px | 240–320px | `--search-width` to `--search-width-max` | Global / table search |

## CSS Variable Reference

All component sizes are defined as CSS variables in `app/globals.css`:

### Heights
```css
--input-height-standard: 40px;   /* Standard form inputs */
--input-height-table: 32px;       /* Inline table inputs */
```

### Text Input Widths
```css
--input-width-short: 120px;
--input-width-short-max: 150px;
--input-width-default: 240px;
--input-width-default-max: 320px;
--input-width-medium: 180px;
--input-width-medium-max: 240px;
--input-width-long: 300px;
--input-width-long-max: 400px;
```

### Dropdown Widths
```css
--select-width-default: 240px;
--select-width-default-max: 320px;
--select-width-short: 150px;
--select-width-short-max: 180px;
```

### Table Input Widths
```css
--table-input-width-min: 80px;
--table-input-width-max: 160px;
--table-select-width-min: 120px;
--table-select-width-max: 180px;
```

### Specialized Components
```css
--datepicker-width: 180px;
--datepicker-width-max: 220px;
--search-width: 240px;
--search-width-max: 320px;
--textarea-height-min: 80px;
--textarea-height-max: 160px;
```

## Usage Guidelines

### Standard Inputs
Use the standard 40px height for most form inputs. Apply appropriate width based on the expected content:
- **Short**: Numbers, percentages, small codes
- **Default**: Most text fields
- **Medium**: Dates, prices
- **Long**: Dropdowns with longer options, customer/vendor names

### Table Inputs
Use 32px height for inputs embedded within data tables to maintain compact row spacing.

### Responsive Behavior
- On mobile/tablet viewports, inputs should expand to full width while maintaining their height
- Maximum widths prevent inputs from becoming too wide on large screens
- Consider using min-width and max-width for flexible layouts

### Full-Width Components
For description fields and addresses:
```css
width: 100%;
max-width: 900px;
```

## Implementation Example

```css
/* Short numeric input */
.quantity-input {
  height: var(--input-height-standard);
  width: var(--input-width-short);
}

/* Default text input with max width */
.reference-input {
  height: var(--input-height-standard);
  min-width: var(--input-width-default);
  max-width: var(--input-width-default-max);
}

/* Table inline input */
.table-cell-input {
  height: var(--input-height-table);
  width: var(--table-input-width-min);
}
```

## Consistency Checklist

When adding new form components, ensure:
- ✓ Height follows standard (40px) or table (32px) specification
- ✓ Width is appropriate for the data type
- ✓ CSS variables are used instead of hardcoded values
- ✓ Component maintains consistent spacing with surrounding elements
- ✓ Responsive behavior is tested on mobile/tablet viewports
