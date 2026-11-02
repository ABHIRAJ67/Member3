# MFG Pro – Quality Control Management System

### Group 19: Member 3 Standalone Application

An enterprise-grade, standalone Quality Management System (QMS) engineered for industrial discrete manufacturing. Designed and implemented exclusively for **Member 3** of **Group 19**, focusing entirely on Quality Assurance, Inspection Lifecycle Management, Defect Tracking, and Closed-Loop Corrective and Preventive Actions (CAPA).

---

## 👥 Member 3 Scope & Ownership

This application contains **strictly Member 3's domain responsibilities**:

| Module | Core Functional Features |
|---|---|
| **1. Quality Dashboard** | • Real-time dynamic KPI cards: Total Inspections, Passed, Failed, Pending, Total Defects, Critical Defects, Open CAPA, Completed CAPA, First Pass Yield (FPY %), Inspection Pass Rate %, Defect Rate %.<br>• Visualizations: Inspection Results by Type, Defects by Severity, Defects by Category, CAPA Status Distribution, Monthly Inspection Trend, Recent Inspection Activities, Critical Defect Alerts.<br>• All KPIs and charts dynamically computed from live records (zero hardcoded values). |
| **2. Quality Inspections** | • Inspection lifecycle tracking: `Pending`, `In Progress`, `Passed`, `Failed`, `Reinspection Required`.<br>• Four standardized inspection types: Incoming Material, In-Process, Final Product, Random Sampling.<br>• Strict quantity validation rule: $\text{Good Quantity} + \text{Defective Quantity} = \text{Total Inspected Quantity}$.<br>• Anti-duplicate inspection checks (same batch + type + date).<br>• Advanced search, multi-criteria filtering (status, type, date, production order ref), and modal inspection history inspector. |
| **3. Defect Management** | • Complete defect tracking across 8 industrial categories (Dimensional, Surface, Material, Functional, Assembly, Packaging, Electrical, Other).<br>• Severity classification (`Critical`, `Major`, `Minor`) with resolution lifecycle (`Open`, `Under Investigation`, `Corrective Action Assigned`, `Resolved`, `Closed`).<br>• Defect quantity threshold validation (defects cannot exceed linked inspection's defective count).<br>• Direct relational link: $\text{Inspection ID} \rightarrow \text{Defect ID}$. |
| **4. Corrective Actions (CAPA)** | • Closed-loop CAPA workflow (`Open`, `Assigned`, `In Progress`, `Pending Verification`, `Completed`, `Rejected`).<br>• Integrated **5 Whys Root Cause Analysis** chain.<br>• Integrated **Fishbone / Ishikawa Diagram** cause classification (Man, Machine, Method, Material, Measurement, Environment).<br>• Formal verification process (`Effective`, `Not Effective`, `Requires Further Action`) with verification records (date, verifier, notes).<br>• Strict compliance guard: CAPAs cannot be marked Completed without verification. |

---

## 🛡️ Strict Standalone Boundary

This application contains **ONLY** Member 3's deliverables:
- **No Member 1 modules**: No Production Orders, Work Centres, Machine Management, or Scheduling.
- **No Member 2 modules**: No Raw Materials, Bill of Materials (BOM), or Inventory Management.
- **No Member 4 modules**: No Central Production Dashboard, Downtime Tracking, or Yield Analytics.
- **No hidden routes or disabled menus**: Navigation and routing are built cleanly from the ground up for Member 3 only.

---

## 🛠️ Technology Stack

- **Framework**: Angular 22 (Standalone Components)
- **Language**: TypeScript (`.ts`) with strict type safety and domain models
- **Styling**: Pure CSS (`.css`) implementing the MFG Pro industrial ERP design language
- **State & Storage**: Centralized `DataService` with persistent `localStorage` synchronization
- **Visualization**: Pure-CSS charts, progress bars, and responsive flex/grid layouts

---

## 📁 Architecture & File Layout

```
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   │   └── interfaces.ts                 # Type definitions: QualityInspection, DefectRecord, CAPARecord, 5-Whys, Fishbone
│   │   └── services/
│   │       ├── data.service.ts               # Centralized localStorage QMS data repository & business calculations
│   │       └── notification.service.ts       # Global toast alerts system
│   ├── layout/
│   │   ├── header.component.*                # Plant clock, shift status, QMS profile, reset button
│   │   └── sidebar.component.*               # Clean Quality Control sidebar navigation (4 items only)
│   ├── modules/
│   │   └── quality/
│   │       ├── quality-dashboard.component.* # Dynamic KPI grid, charts, trends & critical alerts
│   │       ├── inspections.component.*       # Inspection CRUD, quantity check, search & filters
│   │       ├── defects.component.*           # Defect registration, severity tracking & inspection link
│   │       └── capa.component.*              # CAPA lifecycle, 5 Whys, Ishikawa Fishbone & verification
│   ├── app.routes.ts                         # Routing configured exclusively for Member 3 modules
│   ├── app.ts / app.html / app.css           # Root application shell
│   └── app.config.ts                         # Application providers
└── styles.css                                # Global MFG Pro industrial design system
```

---

## 🚀 Running the Application

### 1. Development Server
Run the local dev server:
```bash
npm start
```
Navigate to `http://localhost:4200/`. The app will automatically redirect to `/quality/dashboard`.

### 2. Production Build
Verify compilation:
```bash
npm run build
```
Build output is generated cleanly in `dist/manufacturing-app`.

---

## 🧪 Demonstration Dataset & Factory Reset

The system initializes with realistic discrete manufacturing quality records:
- **8 Quality Inspection records** spanning Incoming, In-Process, Final, and Sampling audits.
- **5 Defect records** categorized with severity, root cause, and department accountability.
- **3 CAPA records** demonstrating complete 5 Whys chains, Fishbone analyses, and verification workflows.
- Traceable relational links: `Inspection ID` $\rightarrow$ `Defect ID` $\rightarrow$ `CAPA ID`.

> **Note**: Click **"Reset Data"** in the top navigation bar or **"Restore Demo Data"** in the sidebar at any time to restore the initial demonstration state.
