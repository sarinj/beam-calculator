# Footing Design - Quick Start Guide

## Getting Started in 3 Steps

### Step 1: Open the Footing Design Page
1. Go to the home page
2. Scroll to the "Footing Design and Plot" section
3. Click on the footing card to navigate to the design page

### Step 2: Enter Design Parameters
1. **Concrete Strength (f'c)**: Enter the concrete grade in ksc
   - Example: 240 ksc
2. **Allowable Soil Bearing Capacity**: Enter in Tonf/m²
   - Example: 10 Tonf/m²

### Step 3: Import Your Excel File
1. Click "Import Excel File" button
2. Select your .xlsx file containing:
   - **Joint Reactions** sheet (columns C, D, H)
   - **Point Object Connectivity** sheet (columns A, F, G)
3. View instant results in the table and plot!

## Reading the Results

### Data Table
| Column | Meaning | Good If |
|--------|---------|---------|
| Unique Name | Footing identifier | Matches your design |
| x, y | Footing location (meters) | As per building plan |
| DL + SDL | Total dead load (Tonf) | From structural analysis |
| LL | Live load (Tonf) | From structural analysis |
| Total Load | Sum of all loads (Tonf) | DL+SDL+LL |
| Required Area | Theoretical size (m²) | For reference |
| B=D | Actual footing size (m) | Use this dimension |
| Utilization | Capacity usage (%) | **≤100% is OK** |

### Footing Plot Colors
- **🟢 Green**: 0-85% utilization (Safe)
- **🟡 Yellow**: 85-100% utilization (Acceptable)
- **🔴 Red**: >100% utilization (Over-capacity - redesign needed)

## Common Scenarios

### Scenario 1: Most Footings Acceptable, One Over-Capacity
**Solution**: Increase footing size for the red footing manually, or:
1. Reduce live loads if possible
2. Redistribute loads between footings
3. Use a raft foundation instead

### Scenario 2: All Footings Over-Capacity
**Solutions**:
1. Increase allowable bearing capacity (improve soil)
2. Reduce the total building load
3. Use deep foundation (piles)
4. Increase footing dimensions manually (but verify with soil engineer)

### Scenario 3: Over-designed Footings (All Green, Low Utilization)
**Options**:
1. Reduce footing sizes to save cost
2. Consider revised soil bearing capacity
3. Accept extra safety factor

## Tips & Tricks

### File Format Tips
- Save your Excel file in **.xlsx** format (not .xls)
- Copy data from SAP2000, ETABS, or other software exactly as required
- Test with a small file first

### Design Tips
- Round up to nearest 0.2 m for practical construction
- Add safety margin to bearing capacity
- Verify with geotechnical engineer
- Check local building codes

### Visualization Tips
- Zoom in/out on browser to see details
- Hover over footings to see values
- Use the legend to understand color coding
- Screenshot the plot for your report

## Troubleshooting

### "Failed to parse Excel file"
✓ Make sure the file is in .xlsx format  
✓ Check sheet names are exactly: "Joint Reactions" and "Point Object Connectivity"  
✓ Verify data is in columns C, D, H and A, F, G

### "No data found"
✓ Check that you have data in all required columns  
✓ Ensure Unique Names match between both sheets  
✓ Remove header rows if data starts from row 1

### Footings missing from results
✓ Verify Unique Name spelling and spacing matches  
✓ Check coordinates are numbers, not text  
✓ Ensure all required data is present

### Weird footing sizes
✓ Check your input values (f'c and bearing capacity)  
✓ Verify load values from Excel are in Tonf  
✓ Recalculate manually: Area = Load / Capacity

## Excel File Example

Create a simple test file:

**Sheet: Joint Reactions**
```
     C    D      H
     P1   DL     100
     P1   SDL    50
     P1   LL     25
     P2   DL     150
     P2   SDL    75
     P2   LL     40
```

**Sheet: Point Object Connectivity**
```
     A    F      G
     P1   0.0    0.0
     P2   5.0    0.0
```

## Next Steps

After design:
1. **Extract Results**: Copy table data to your report
2. **Save Plot**: Take screenshot for documentation
3. **Verify**: Check with geotechnical engineer
4. **Specify**: Use B=D values in design drawings
5. **Construct**: Ensure contractor builds to specification

## Need Help?

- Check **FOOTING_DESIGN_GUIDE.md** for detailed documentation
- See **EXCEL_TEMPLATE_GUIDE.md** for Excel format details
- Review **IMPLEMENTATION_SUMMARY.md** for technical information

## Key Formula

```
Step 1: Total Load = DL + SDL + LL
Step 2: Required Area = Total Load / Allowable Bearing Capacity
Step 3: B = D = √(Required Area) ← rounded up to 0.2m
Step 4: Utilization = (Total Load / (B × D × Capacity)) × 100%
```

**Simple Example:**
```
Total Load = 100 + 50 + 25 = 175 Tonf
Area = 175 / 10 = 17.5 m²
B = D = √17.5 = 4.18 m → 4.2 m (rounded)
Utilization = (175 / (4.2 × 4.2 × 10)) × 100 = 99.2%
```

## Remember

✅ Always verify with soil testing report  
✅ Check local building code requirements  
✅ Include safety factors  
✅ Document your design assumptions  
✅ Get PE approval before construction  

**Happy Designing! 🏗️**
