# Footing Design and Plot Feature

## Overview

The Footing Design and Plot page allows engineers to design isolated footings (square footings) based on soil bearing capacity constraints. The application processes joint reactions and point locations from an Excel file, calculates footing dimensions, and visualizes them on a 2D layout plot.

## Features

### Input Interface
- **f'c (Concrete Strength)**: Input in ksc (kilogram-force per square centimeter)
- **Allowable Soil Bearing Capacity**: Input in Tonf/m² (Tonnes-force per square meter)
- **Excel File Import**: Load footing data from `.xlsx` files

### Excel File Format

The application reads two sheets from the Excel file:

#### Sheet 1: Joint Reactions
- **Column C**: Unique Name (footing identifier)
- **Column D**: Output Case (DL, SDL, LL, etc.)
- **Column H**: Fz (vertical force in Tonf)

The application automatically:
- Groups reactions by Unique Name
- Combines DL and SDL loads
- Separates LL (Live Load) loads

#### Sheet 2: Point Object Connectivity
- **Column A**: Unique Name (footing identifier, matches Joint Reactions)
- **Column F**: x-coordinate (in meters)
- **Column G**: y-coordinate (in meters)

### Calculation Process

1. **Load Grouping**: 
   - DL + SDL = Dead Load + Super Imposed Dead Load
   - LL = Live Load
   - Total Load = DL + SDL + LL

2. **Footing Dimension Calculation**:
   - Required Area = Total Load / Allowable Soil Bearing Capacity
   - Assuming square footing: B = D = √(Required Area)
   - Round up to nearest 0.2 m
   - Final footing area: B × D (with rounded dimensions)

3. **Utilization Ratio**:
   - Ratio (%) = (Total Load / (B × D × Allowable Soil Bearing Capacity)) × 100
   - Green: ≤ 85% (Good)
   - Amber: 85% - 100% (Acceptable)
   - Red: > 100% (Over-capacity)

### Output Display

#### Data Table
Shows all processed footings with:
- Unique Name
- X and Y coordinates (m)
- DL + SDL load (Tonf)
- LL load (Tonf)
- Total Load (Tonf)
- Required Area (m²)
- Calculated Footing Dimension B=D (m)
- Utilization Ratio (%)

#### Footing Layout Plot
Visual representation showing:
- Footing squares centered at (x, y) coordinates
- Color-coded by utilization ratio:
  - Green: Good (≤85%)
  - Amber: Acceptable (85-100%)
  - Red: Over-capacity (>100%)
- Grid background for reference
- Legend showing utilization ranges
- Footing dimensions (B=D) to scale

## Component Architecture

### Components
- **FootingCalculator**: Main component orchestrating the page layout
- **FootingInputs**: Left sidebar with input fields and file upload
- **FootingTable**: Data table displaying calculated results
- **FootingPlot**: Canvas-based visualization of footing layout
- **FootingTypeCard**: Homepage card linking to footing design

### Utilities
- **lib/excel-parser.ts**: Reads and parses Excel files
- **lib/calculations/footing.ts**: Performs footing calculations
- **types/footing.ts**: TypeScript interfaces for footing data

## Usage Example

1. Navigate to the Footing Design page from the home screen
2. Enter concrete strength (f'c) in ksc (default: 240)
3. Enter allowable soil bearing capacity in Tonf/m² (default: 10)
4. Click "Import Excel File" and select your .xlsx file
5. View the data table with all calculated footings
6. Review the footing layout plot to visualize placement
7. Check the utilization ratio to ensure design compliance

## Assumptions

- Ignores footing self-weight
- Ignores soil cover weight
- Assumes square footings (B = D)
- Rounds footing dimensions to nearest 0.2 m
- Uses simple centered positioning at joint coordinates

## Translation Support

The feature supports both English and Thai languages for:
- Input labels and descriptions
- Column headers in data table
- Error messages
- UI button labels

## Responsive Design

- Mobile-friendly interface
- Responsive canvas sizing for footing plot
- Scrollable table on smaller screens
- Adaptive sidebar and main content layout
