from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import re
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

def _normalise(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# \b-anchored so short keywords only match whole words, e.g. "fee" no longer
# matches inside "coffee"/"toffee", and "rent" no longer matches inside
# "parent"/"different".
CATEGORY_PATTERNS = {
    'Bills':         re.compile(r'\b(?:bill|recharge|electricity|broadband|emi|insurance|rent)\b'),
    'Food':          re.compile(r'\b(?:food|restaurant|cafe|hotel|eat|lunch|dinner|breakfast)\b'),
    'Travel':        re.compile(r'\b(?:travel|cab|auto|bus|train|flight|metro|fuel|petrol)\b'),
    'Shopping':      re.compile(r'\b(?:shop|store|mart|purchase|order|delivery)\b'),
    'Medical':       re.compile(r'\b(?:hospital|clinic|pharmacy|doctor|medicine|health)\b'),
    'Education':     re.compile(r'\b(?:school|college|course|book|exam|fee|tuition)\b'),
    'Entertainment': re.compile(r'\b(?:movie|cinema|game|concert|event|ticket|fun)\b'),
    'Income':        re.compile(r'\b(?:salary|credit|income|bonus|stipend|payment received)\b'),
}

def _lookup_override(con, user_id: int, norm: str, norm_stripped: str):
    """
    Stage 0: check this user's learned corrections before falling back to
    the shared dictionary/regex stages. A prior explicit correction should
    always outrank a generic merchant-dictionary or keyword-regex guess.
    Returns the learned category, or None if no override matches.
    """
    if con is None or user_id is None:
        return None
    rows = con.execute(
        "SELECT keyword, category FROM merchant_overrides WHERE user_id=?",
        [user_id]
    ).fetchall()
    for keyword, cat in rows:
        if not keyword:
            continue  # defensive: never let a blank keyword match everything
        keyword_stripped = keyword.replace(' ', '')
        if keyword in norm or keyword_stripped in norm_stripped:
            return cat
    return None

def categorise(description: str, merchant: str, con=None, user_id: int = None) -> tuple:
    """
    Stage 0 (optional): user-specific learned overrides, built from prior
    corrections via POST /categorisation/correct. Only runs when a DB
    connection and user_id are supplied; omitted callers (e.g. tests) fall
    straight through to the shared stages below.

    Stage 1: merchant-dictionary lookup, checked against both a spaced and a
    space-stripped normalisation, so UPI-style concatenated merchant
    references ("AmazonIndia") resolve the same as spaced ones
    ("Amazon India") for multi-word dictionary keys like "amazon prime".

    Stage 2: boundary-safe (\\b-anchored) keyword regex.

    Stage 3 (statistical NLP fallback) is not yet implemented here; unmatched
    text still defaults to 'Other' at a flat 0.50 confidence.
    """
    norm = _normalise(f"{description} {merchant}")
    norm_stripped = norm.replace(' ', '')

    override_cat = _lookup_override(con, user_id, norm, norm_stripped)
    if override_cat:
        return override_cat, 0.97

    for keyword, cat in MERCHANT_DICT.items():
        keyword_stripped = keyword.replace(' ', '')
        if keyword in norm or keyword_stripped in norm_stripped:
            return cat, 0.95

    for cat, pattern in CATEGORY_PATTERNS.items():
        if pattern.search(norm):
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
        cat, conf = categorise(txn.description or "", txn.merchant or "",
                                con=con, user_id=user["user_id"])
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
            cat, conf = categorise(desc, merchant, con=con, user_id=user["user_id"])
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

                cat, conf = categorise('', merchant, con=con, user_id=user["user_id"])

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
