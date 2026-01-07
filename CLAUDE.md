# CLAUDE.md - Project Handover Document

## Project Overview

**Name:** Vacation Expense Calculator (Kalkulačka nákladov z dovolenky)
**Language:** Slovak (UI), English (code comments acceptable)
**Type:** Single-page React application (standalone HTML)
**Purpose:** Fair expense splitting between families/groups and individuals after a shared vacation

## Repository Setup

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/vacation-calculator.git
cd vacation-calculator

# The app is a single index.html file - no build process needed
# To test locally:
python -m http.server 8000
# Then open http://localhost:8000
```

## Tech Stack

- **React 18** - loaded from CDN (cdnjs.cloudflare.com)
- **Babel Standalone** - for JSX transformation in browser
- **Tailwind CSS** - loaded from CDN (cdn.tailwindcss.com)
- **LocalStorage** - for persisting calculations
- **Base64 URL encoding** - for shareable links (no backend needed)

## Current Features (Implemented)

### Core Functionality
1. **Groups and Individuals**
   - Support for up to 15 participants (groups or individuals)
   - Groups can have multiple members, individuals are single-person
   - Visual distinction: 👨‍👩‍👧 for groups, 👤 for individuals

2. **Member Configuration**
   - Each member has: name (optional), type (adult/child), coefficient
   - Coefficients: 0.1× to 1.0× in dropdown, or custom value
   - Recommended coefficients: Adult 1.0×, Child 8+ 0.7×, Child 5-7 0.5×, Child <5 0.3×

3. **Expense Categories**
   - 🏠 Accommodation
   - 🍽️ Food  
   - 📦 Other

4. **Calculation Methods (per category)**
   - "Rovným dielom" (Equal split) - divide equally among all participants
   - "Podľa osôb a koeficientov" (Per person) - weighted by coefficients × nights

5. **Results**
   - Total expenses by category
   - Per-participant breakdown with expandable member details
   - Balance (who paid vs. who should pay)
   - Settlement instructions (who pays whom)

6. **Sharing**
   - Generates URL with all data encoded in base64
   - Works for anyone (no login required)
   - Shared links are read-only

7. **Persistence**
   - LocalStorage for saving calculations locally
   - List of saved calculations on home screen

### UI/UX
- Slovak language interface
- Mobile-responsive design
- Three tabs: Účastníci (Participants), Náklady (Expenses), Výsledky (Results)
- Sticky header with save/share buttons

## File Structure

```
vacation-calculator/
├── index.html      # Complete application (single file)
├── README.md       # Documentation
├── LICENSE         # MIT License
└── CLAUDE.md       # This file (project context for AI)
```

## Key Code Structure (inside index.html)

```javascript
// Utility functions
generateId()              // Random ID generator
encodeCalcData(calc)      // Encode calculation to URL-safe base64
decodeCalcData(encoded)   // Decode from base64

// Default factories
defaultGroup(type)        // Creates new group/individual
defaultExpense()          // Creates new expense
defaultSettings()         // Creates default calculation settings
defaultCalculation()      // Creates new calculation

// Storage
saveToLocalStorage(calculations)
loadFromLocalStorage()

// Business logic
calculateShares(calculation)  // Main calculation engine

// React Components
SettingsPanel             // Calculation method settings
GroupEditor               // Edit group/individual
ExpenseEditor             // Edit single expense
NotesEditor               // Notes field
ResultsPanel              // Display results with expandable details
CalculationView           // Main calculation editor (3 tabs)
HomeView                  // Home screen with calculation list
VacationExpensesApp       // Root component
```

## Data Models

```typescript
// Calculation
{
  id: string,
  name: string,
  createdAt: string (ISO),
  families: Group[],        // Note: still called "families" internally
  expenses: Expense[],
  settings: Settings,
  notes: string
}

// Group (family or individual)
{
  id: string,
  name: string,
  type: 'group' | 'individual',
  members: Member[],
  nights: number
}

// Member
{
  id: string,
  name: string,
  isChild: boolean,
  coefficient: number
}

// Expense
{
  id: string,
  familyId: string,         // Reference to group that paid
  category: 'accommodation' | 'food' | 'other',
  description: string,
  amount: number
}

// Settings
{
  accommodation: 'perFamily' | 'perPerson',
  food: 'perFamily' | 'perPerson',
  other: 'perFamily' | 'perPerson'
}
```

## Calculation Formula

For "perPerson" method:
```
weightedUnits = sum(member.coefficient) × nights
share = (participant.weightedUnits / totalWeightedUnits) × categoryTotal
```

For "perFamily" method:
```
share = categoryTotal / numberOfParticipants
```

## Potential Future Improvements

1. **Export options** - PDF export, CSV export
2. **Currency selector** - currently hardcoded to €
3. **Multiple trips** - better organization of calculations
4. **Expense splitting** - allow splitting single expense among selected participants only
5. **Receipt photos** - attach images to expenses
6. **Real-time collaboration** - WebSocket sync between users
7. **PWA** - offline support, installable app
8. **Print-friendly view** - optimized for printing results
9. **Undo/redo** - history of changes
10. **Dark mode** - theme support

## Known Limitations

- All data is in URL for sharing (can get long with many expenses)
- No user authentication
- No cloud sync (LocalStorage only)
- Single currency (EUR)

## Development Notes

- The app uses Babel in-browser transformation (slower but simpler)
- For production, consider pre-compiling JSX
- Tailwind is loaded from CDN (consider local build for customization)
- All state is managed with React useState hooks

## Testing the App

1. Open index.html in browser
2. Create a new calculation
3. Add groups/individuals
4. Add some expenses
5. Check results tab
6. Click "Uložiť a zdieľať" to generate shareable link
7. Open the link in incognito window to test read-only view

## Commands for Claude Code

```bash
# Start local server
python -m http.server 8000

# Or with Node.js
npx serve .

# Deploy to GitHub Pages (already configured if following setup)
git add .
git commit -m "Update"
git push origin main
```
