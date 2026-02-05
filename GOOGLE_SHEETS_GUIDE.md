# Google Sheets Template Guide

## 📊 How to Structure Your Business Data

This guide shows you how to organize your data in Google Sheets so the bot can read it effectively.

---

## 🎯 General Rules

1. **Use separate sheet tabs** for different data types
2. **First row = Headers** (column names)
3. **No empty rows** in the middle of data
4. **Consistent formatting** (dates, numbers, etc.)
5. **No merged cells**

---

## 📋 Recommended Sheet Structure

### Sheet 1: Price History

Perfect for your AutoCount price export!

```
Date       | Invoice     | Customer Name              | Product Code | Product Description      | Quantity | Unit | Unit Price
-----------|-------------|----------------------------|--------------|-------------------------|----------|------|------------
10/01/2025 | IV-2501-020 | ALLIED SEA PRODUCTS        | SF-001       | FROZEN SHARK FIN        | 1,500    | PKT  | 33.8
11/01/2025 | IV-2501-027 | SOON LEE SEAFOOD           | SC-004       | SEA CUCUMBER            | 12       | KG   | 344
```

**How to populate:**
1. Export from AutoCount
2. Open CSV file
3. Copy all data
4. Paste into this sheet

---

### Sheet 2: Current Stock

Track your inventory levels:

```
Product Code | Product Name              | Current Stock | Unit | Min Level | Max Level | Location    | Supplier
-------------|---------------------------|---------------|------|-----------|-----------|-------------|------------------
SF-001       | FROZEN SHARK FIN          | 150          | PKT  | 50        | 500       | Warehouse A | Allied Sea
SC-004       | SEA CUCUMBER              | 200          | KG   | 75        | 300       | Warehouse A | Hong Soon
FM-NZ-1015   | NZ DRIED FISH MAW         | 45           | KG   | 20        | 100       | Warehouse B | Tekkah
```

**Bot can answer:**
- "What's the stock level for shark fin?"
- "Which products are below minimum level?"
- "Show me all items from Allied Sea supplier"

---

### Sheet 3: Property - Rental Income

Track your rental properties:

```
Property Name | Unit No | Tenant Name    | Monthly Rent | Due Date | Payment Status | Contract Start | Contract End
--------------|---------|----------------|--------------|----------|----------------|----------------|-------------
Sunway Tower  | A-12-03 | ABC Sdn Bhd    | RM 3,500    | 1st      | Paid          | 01/01/2024     | 31/12/2025
Cyberjaya Hub | B-05-08 | Tech Solutions | RM 2,800    | 5th      | Pending       | 15/06/2024     | 14/06/2026
KLCC Suites   | C-20-15 | John Tan       | RM 4,200    | 1st      | Paid          | 01/03/2024     | 28/02/2026
```

**Bot can answer:**
- "What's my total rental income this month?"
- "Which tenants haven't paid yet?"
- "Show me all properties in Sunway"
- "When does the ABC Sdn Bhd contract expire?"

---

### Sheet 4: Property - Loan Payments

Track property loans and mortgages:

```
Property Name | Bank Name   | Loan Amount | Monthly Payment | Interest Rate | Payment Date | Balance Remaining | Maturity Date
--------------|-------------|-------------|-----------------|---------------|--------------|-------------------|---------------
Sunway Tower  | Maybank     | RM 800,000  | RM 4,500       | 3.5%          | 5th          | RM 650,000       | 01/01/2035
Cyberjaya Hub | CIMB        | RM 600,000  | RM 3,200       | 3.8%          | 10th         | RM 520,000       | 15/06/2038
```

**Bot can answer:**
- "What are my total monthly loan payments?"
- "Which loan has the highest interest rate?"
- "When is the next payment due?"

---

### Sheet 5: Property - Utilities & Expenses

Track ongoing property expenses:

```
Property Name | Expense Type    | Provider      | Monthly Cost | Due Date | Auto-Debit | Last Paid  | Status
--------------|-----------------|---------------|--------------|----------|------------|------------|--------
Sunway Tower  | Electricity     | TNB           | RM 450      | 15th     | Yes        | 15/12/2025 | Paid
Sunway Tower  | Water           | Air Selangor  | RM 120      | 20th     | Yes        | 20/12/2025 | Paid
Sunway Tower  | Council Fee     | MBPJ          | RM 200      | 1st      | No         | 01/01/2026 | Due
Cyberjaya Hub | Internet        | Time          | RM 300      | 5th      | Yes        | 05/01/2026 | Paid
Cyberjaya Hub | Security        | SecurePlus    | RM 150      | 1st      | No         | 01/12/2025 | Overdue
```

**Bot can answer:**
- "What's my total utilities cost this month?"
- "Which bills are overdue?"
- "Show me all expenses for Sunway Tower"

---

### Sheet 6: Customers (Optional)

Customer master list:

```
Customer Code | Customer Name              | Contact Person | Phone          | Email                    | Address              | Outstanding Balance
--------------|----------------------------|----------------|----------------|--------------------------|----------------------|--------------------
CUST-001      | ALLIED SEA PRODUCTS        | Mr. Tan        | +60123456789  | tan@allied.com          | Kuala Lumpur         | RM 15,000
CUST-002      | SOON LEE SEAFOOD           | Ms. Lee        | +60198765432  | lee@soonlee.com         | Petaling Jaya        | RM 0
```

**Bot can answer:**
- "Who is the contact person for Allied Sea?"
- "Which customers have outstanding balances?"
- "Give me contact details for Soon Lee"

---

## 🎨 Formatting Tips

### Dates:
- **Use consistent format**: `DD/MM/YYYY` (e.g., 15/01/2026)
- Bot understands various formats, but consistency helps

### Numbers:
- **Currency**: Can use `RM 3,500` or just `3500`
- **Large numbers**: Can use commas `1,500` or not `1500`
- **Decimals**: Use dot `.` not comma `,` → `3.14` not `3,14`

### Text:
- **Avoid special characters** in headers if possible
- **Be consistent** with naming (e.g., always "Shark Fin" not sometimes "SharkFin")

---

## 🔄 How to Update Data

### Daily Updates:
1. Export fresh data from AutoCount
2. Open your Google Sheet
3. Select all old data in "Price History" tab
4. Delete it
5. Paste new data
6. **Bot sees changes immediately!** (no restart needed)

### Manual Entries:
- Just type directly into Google Sheets
- Bot reads it in real-time
- Can update from phone too (Google Sheets app)

---

## 💡 Pro Tips

### 1. Use Data Validation
- Set dropdowns for consistent values
- Example: Payment Status → "Paid", "Pending", "Overdue"

### 2. Conditional Formatting
- Highlight overdue items in red
- Low stock items in yellow
- Makes it visual for you (bot doesn't need it, but helps you!)

### 3. Multiple Sheets per Category
Instead of one huge sheet, split into:
- `Price_2025_Q1`
- `Price_2025_Q2`
- `Price_2024` (archived)

Bot can read all of them!

### 4. Add Notes Column
- For unusual transactions
- Bot can read these too
- Example: "Customer requested discount due to bulk order"

---

## 📱 Mobile Access

You can update sheets from your phone:
1. Install Google Sheets app
2. Open your sheet
3. Edit directly
4. Changes sync automatically
5. Bot sees them immediately!

Perfect for updating stock levels on the go!

---

## ⚠️ Common Mistakes to Avoid

❌ **Don't use merged cells** - Bot can't read them properly
❌ **Don't leave empty rows** in middle of data
❌ **Don't use different date formats** in same column
❌ **Don't forget headers** - First row must have column names
❌ **Don't protect sheets** - Bot needs read access

✅ **Do keep it simple and consistent**
✅ **Do use descriptive headers**
✅ **Do update regularly**
✅ **Do test by asking the bot!**

---

## 🧪 Testing Your Setup

After you've set up your sheets, test with these questions:

1. "How many sheets do I have?" (Should list all your tabs)
2. "What's in the Price History sheet?"
3. "Show me the most recent invoice"
4. "What's my total rental income?"
5. "Which properties have loans?"

If bot answers correctly, you're all set! 🎉

---

## 📈 As You Grow

You can add more sheets anytime:
- `Sales_Summary`
- `Supplier_Contacts`
- `Inventory_Movements`
- `Commission_Tracking`
- Whatever you need!

Bot automatically sees new sheets and can answer questions about them.

---

Happy organizing! 📊
