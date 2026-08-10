from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import pandas as pd
import io
from bs4 import BeautifulSoup
import pdfplumber
from database import get_connection
from auth import get_current_user

router = APIRouter()

CATEGORIES = ['Food','Travel','Bills','Shopping','Education',
              'Medical','Entertainment','Income','Other']

MERCHANT_DICT = {
    'swiggy': 'Food', 'zomato': 'Food', 'dominos': 'Food',
    'mcdonald': 'Food', 'starbucks': 'Food', 'subway': 'Food',
    'uber': 'Travel', 'ola': 'Travel', 'rapido': 'Travel',
    'irctc': 'Travel', 'makemytrip': 'Travel', 'indigo': 'Travel',
    'bescom': 'Bills', 'airtel': 'Bills', 'jio': 'Bills',
    'netflix': 'Entertainment', 'spotify': 'Entertainment',
    'amazon prime': 'Entertainment', 'hotstar': 'Entertainment',
    'amazon': 'Shopping', 'flipkart': 'Shopping', 'myntra': 'Shopping',
    'apollo': 'Medical', 'medplus': 'Medical',
    'coursera': 'Education', 'udemy': 'Education',
    'salary': 'Income', 'stipend': 'Income',
}

def categorise(description: str, merchant: str) -> tuple:
    text = f"{description} {merchant}".lower()
    for keyword, cat in MERCHANT_DICT.items():
        if keyword in text:
            return cat, 0.95
    import re
    patterns = {
        'Bills':         r'bill|recharge|electricity|broadband|emi|insurance|rent',
        'Food':          r'food|restaurant|cafe|hotel|eat|lunch|dinner|breakfast',
        'Travel':        r'travel|cab|auto|bus|train|flight|metro|fuel|petrol',
        'Shopping':      r'shop|store|mart|purchase|order|delivery',
        'Medical':       r'hospital|clinic|pharmacy|doctor|medicine|health',
        'Education':     r'school|college|course|book|exam|fee|tuition',
        'Entertainment': r'movie|cinema|game|concert|event|ticket|fun',
        'Income':        r'salary|credit|income|bonus|stipend|payment received',
    }
    for cat, pattern in patterns.items():
        if re.search(pattern, text):
            return cat, 0.75
    return 'Other', 0.50

def fix_date(date_str: str) -> str:
    for fmt in ['%d-%m-%Y','%Y-%m-%d','%d/%m/%Y','%m/%d/%Y']:
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime('%Y-%m-%d')
        except:
            continue
    return date_str

class ManualTransaction(BaseModel):
    date: str
    amount: float
    direction: str
    description: Optional[str] = ""
    merchant: Optional[str] = ""
    category: Optional[str] = None
    note: Optional[str] = ""

@router.get("/")
def get_transactions(
    category: Optional[str] = None,
    direction: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user=Depends(get_current_user)
):
    con = get_connection()
    try:
        query = "SELECT * FROM transactions WHERE user_id = ?"
        params = [user["user_id"]]
        if category:
            query += " AND category = ?"
            params.append(category)
        if direction:
            query += " AND direction = ?"
            params.append(direction)
        if date_from:
            query += " AND date >= ?"
            params.append(date_from)
        if date_to:
            query += " AND date <= ?"
            params.append(date_to)
        query += " ORDER BY date DESC"
        rows = con.execute(query, params).fetchall()
        cols = ['transaction_id','user_id','date','amount','direction',
                'description','merchant','category','source','confidence','note','created_at']
        return [dict(zip(cols, r)) for r in rows]
    finally:
        con.close()

@router.post("/manual")
def add_manual(txn: ManualTransaction, user=Depends(get_current_user)):
    con = get_connection()
    try:
        cat, conf = categorise(txn.description or "", txn.merchant or "")
        if txn.category:
            cat  = txn.category
            conf = 1.0
        con.execute("""
            INSERT INTO transactions
            (user_id,date,amount,direction,description,merchant,category,source,confidence,note)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, [user["user_id"], fix_date(txn.date), txn.amount,
              txn.direction.lower(), txn.description, txn.merchant,
              cat, 'manual', conf, txn.note])
        return {"message": "Transaction added successfully"}
    finally:
        con.close()

@router.post("/import-csv")
async def import_csv(file: UploadFile = File(...), user=Depends(get_current_user)):
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
        df.columns = [c.lower().strip() for c in df.columns]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parse error: {str(e)}")

    results = []
    con = get_connection()
    try:
        for _, row in df.iterrows():
            date      = fix_date(str(row.get('date', '')))
            amount    = float(row.get('amount', 0))
            direction = str(row.get('direction', 'debit')).lower()
            desc      = str(row.get('description', ''))
            merchant  = str(row.get('merchant', ''))
            note      = str(row.get('note', ''))
            cat, conf = categorise(desc, merchant)
            if 'category' in row and str(row['category']) in CATEGORIES:
                cat  = str(row['category'])
                conf = 1.0
            con.execute("""
                INSERT INTO transactions
                (user_id,date,amount,direction,description,merchant,category,source,confidence,note)
                VALUES (?,?,?,?,?,?,?,?,?,?)
            """, [user["user_id"], date, amount, direction,
                  desc, merchant, cat, 'csv', conf, note])
            results.append({"date": date, "amount": amount,
                            "merchant": merchant, "category": cat, "confidence": conf})
    finally:
        con.close()
    return {"imported": len(results), "preview": results[:10]}

@router.post("/import-gpay-html")
async def import_gpay_html(file: UploadFile = File(...), user=Depends(get_current_user)):
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB.")

    content = await file.read()
    soup    = BeautifulSoup(content, 'html.parser')

    transactions = []
    # Google Takeout GPay HTML structure
    items = soup.find_all('div', class_='outer-cell')
    if not items:
        items = soup.find_all('div', class_='content-cell')

    con = get_connection()
    try:
        for item in items:
            try:
                text = item.get_text(separator=' ', strip=True)
                lines = [l.strip() for l in text.split('\n') if l.strip()]

                # Extract amount — look for ₹ symbol
                import re
                amount_match = re.search(r'₹\s*([\d,]+\.?\d*)', text)
                if not amount_match:
                    continue
                amount = float(amount_match.group(1).replace(',', ''))

                # Extract date
                date_match = re.search(
                    r'(\d{1,2}\s+\w+\s+\d{4}|\d{4}-\d{2}-\d{2})', text)
                if not date_match:
                    continue
                try:
                    raw_date = date_match.group(1)
                    date_obj = datetime.strptime(raw_date, '%d %b %Y')
                    date_str = date_obj.strftime('%Y-%m-%d')
                except:
                    continue

                # Direction — GPay usually shows "Paid" or "Received"
                direction = 'credit' if 'received' in text.lower() else 'debit'

                # Merchant — usually first meaningful text block
                merchant = lines[0] if lines else 'Unknown'
                merchant = re.sub(r'₹.*', '', merchant).strip()[:100]

                cat, conf = categorise('', merchant)

                con.execute("""
                    INSERT INTO transactions
                    (user_id,date,amount,direction,description,merchant,
                     category,source,confidence,note)
                    VALUES (?,?,?,?,?,?,?,?,?,?)
                """, [user["user_id"], date_str, amount, direction,
                      text[:200], merchant, cat, 'gpay_html', conf, ''])

                transactions.append({
                    "date": date_str, "amount": amount,
                    "merchant": merchant, "category": cat,
                    "direction": direction, "confidence": conf
                })
            except Exception:
                continue
    finally:
        con.close()

    if not transactions:
        raise HTTPException(
            status_code=400,
            detail="No transactions found. Make sure you uploaded MyActivity.html from Google Takeout."
        )
    return {"imported": len(transactions), "preview": transactions[:10]}

@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int, user=Depends(get_current_user)):
    con = get_connection()
    try:
        con.execute(
            "DELETE FROM transactions WHERE transaction_id = ? AND user_id = ?",
            [transaction_id, user["user_id"]]
        )
        return {"message": "Deleted"}
    finally:
        con.close()