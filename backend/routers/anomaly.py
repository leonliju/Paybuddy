from fastapi import APIRouter, Depends
from database import get_connection
from auth import get_current_user
import pandas as pd
import numpy as np

router = APIRouter()

def run_anomaly_detection(user_id: int, con):
    rows = con.execute("""
        SELECT transaction_id, amount, category,
               DAYOFWEEK(date) as dow
        FROM transactions
        WHERE user_id=? AND direction='debit'
        ORDER BY date
    """, [user_id]).fetchall()

    if len(rows) < 5:
        return []

    df = pd.DataFrame(rows, columns=['transaction_id','amount','category','dow'])

    flags = []

    # Z-Score per category
    for cat, group in df.groupby('category'):
        if len(group) < 3:
            continue
        mean = group['amount'].mean()
        std  = group['amount'].std()
        if std == 0:
            continue
        for _, row in group.iterrows():
            z = (row['amount'] - mean) / std
            if abs(z) > 2.5:
                flags.append({
                    'transaction_id': int(row['transaction_id']),
                    'method': 'zscore',
                    'score':  round(z, 2),
                    'reason': f"Amount ₹{row['amount']:,.0f} is {abs(z):.1f} standard deviations above mean {cat} spend of ₹{mean:,.0f}"
                })

    # Isolation Forest
    try:
        from sklearn.preprocessing import LabelEncoder
        from sklearn.ensemble import IsolationForest
        le  = LabelEncoder()
        df2 = df.copy()
        df2['category_enc'] = le.fit_transform(df2['category'])
        X   = df2[['amount','category_enc','dow']].values
        iso = IsolationForest(contamination=0.1, random_state=42)
        preds = iso.fit_predict(X)
        scores = iso.score_samples(X)
        for i, (pred, score) in enumerate(zip(preds, scores)):
            if pred == -1:
                row = df.iloc[i]
                flags.append({
                    'transaction_id': int(row['transaction_id']),
                    'method': 'isolation_forest',
                    'score':  round(score, 3),
                    'reason': f"Unusual combination of amount ₹{row['amount']:,.0f}, category {row['category']}, and transaction timing"
                })
    except Exception:
        pass

    return flags

@router.get("/detect")
def detect_anomalies(user=Depends(get_current_user)):
    con = get_connection()
    try:
        con.execute(
            "DELETE FROM anomaly_flags WHERE transaction_id IN "
            "(SELECT transaction_id FROM transactions WHERE user_id=?)",
            [user["user_id"]]
        )
        flags = run_anomaly_detection(user["user_id"], con)
        for f in flags:
            con.execute("""
                INSERT INTO anomaly_flags
                (transaction_id, method, reason, score)
                VALUES (?,?,?,?)
            """, [f['transaction_id'], f['method'], f['reason'], f['score']])
        return {"detected": len(flags)}
    finally:
        con.close()

@router.get("/flags")
def get_flags(user=Depends(get_current_user)):
    con = get_connection()
    try:
        rows = con.execute("""
            SELECT af.flag_id, af.method, af.reason, af.score,
                   t.date, t.amount, t.merchant, t.category, t.transaction_id
            FROM anomaly_flags af
            JOIN transactions t ON af.transaction_id = t.transaction_id
            WHERE t.user_id=?
            ORDER BY t.date DESC
        """, [user["user_id"]]).fetchall()
        cols = ['flag_id','method','reason','score',
                'date','amount','merchant','category','transaction_id']
        return [dict(zip(cols, r)) for r in rows]
    finally:
        con.close()