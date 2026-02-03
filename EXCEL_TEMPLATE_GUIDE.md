# Excel File Template Guide

## File Format Requirements

Your Excel file must contain two sheets with the following structure:

### Sheet 1: "Joint Reactions"

| Column | Data | Example |
|--------|------|---------|
| C | Unique Name | P1, P2, P3, ... |
| D | Output Case | DL, SDL, LL, ... |
| H | Fz (Force) | 100, 50, 25 (in Tonf) |

**Example Data:**
```
C         D      H
P1        DL     100
P1        SDL    50
P1        LL     25
P2        DL     150
P2        SDL    75
P2        LL     40
P3        DL     200
P3        SDL    100
P3        LL     50
```

### Sheet 2: "Point Object Connectivity"

| Column | Data | Example |
|--------|------|---------|
| A | Unique Name | P1, P2, P3, ... |
| F | X Coordinate | 0.0, 5.0, 10.0 (in meters) |
| G | Y Coordinate | 0.0, 0.0, 0.0 (in meters) |

**Example Data:**
```
A    F    G
P1   0.0  0.0
P2   5.0  0.0
P3   10.0 0.0
```

## Important Notes

1. **Unique Names Must Match**: The "Unique Name" in both sheets must match exactly
2. **Column Positions Are Critical**: 
   - Use exact columns (C, D, H for Joint Reactions; A, F, G for Connectivity)
   - Other columns are ignored
3. **Case Identification**: 
   - The application looks for "DL" and "SDL" to group dead loads
   - It looks for "LL" to identify live loads
   - Case identification is case-insensitive
4. **Units**:
   - Forces in Tonf (Tonnes-force)
   - Coordinates in meters

## Creating the File

### Using Microsoft Excel:
1. Create a new workbook
2. Rename first sheet to "Joint Reactions"
3. Add headers and data in columns C, D, H
4. Create a second sheet named "Point Object Connectivity"
5. Add headers and data in columns A, F, G
6. Save as .xlsx format

### Using LibreOffice Calc:
1. Create a new spreadsheet
2. Follow the same steps as Excel
3. Export as .xlsx format

### Using Python:
```python
import pandas as pd

# Create sheets
reactions_df = pd.DataFrame({
    'C': ['P1', 'P1', 'P1', 'P2', 'P2', 'P2'],
    'D': ['DL', 'SDL', 'LL', 'DL', 'SDL', 'LL'],
    'H': [100, 50, 25, 150, 75, 40]
})

connectivity_df = pd.DataFrame({
    'A': ['P1', 'P2'],
    'F': [0.0, 5.0],
    'G': [0.0, 0.0]
})

# Create Excel file
with pd.ExcelWriter('footings.xlsx', engine='openpyxl') as writer:
    reactions_df.to_excel(writer, sheet_name='Joint Reactions', index=False)
    connectivity_df.to_excel(writer, sheet_name='Point Object Connectivity', index=False)
```

## Troubleshooting

### "Failed to parse Excel file"
- Check that your file is in .xlsx format
- Verify both sheet names are exactly correct: "Joint Reactions" and "Point Object Connectivity"
- Check that your data is in the correct columns

### "No data found in Excel sheets"
- Ensure you have data in columns C, D, H (Joint Reactions)
- Ensure you have data in columns A, F, G (Point Object Connectivity)
- Check that Unique Names match between sheets

### Missing footings in results
- Verify that the Unique Name appears in both sheets
- Check for extra spaces or formatting differences in names
- Ensure coordinates are numeric values, not text
