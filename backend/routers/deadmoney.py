from fastapi import APIRouter, Depends
from database import get_connection
from auth import get_current_user

router = APIRouter()

@router.get("/detect")
def detect_dead_money(user=Depends(get_current_user)):
    con = get_connection()
    try:
        # Algorithm 1: Zombie Subscriptions
        recurring = con.execute("""
            SELECT merchant, category, AVG(amount) as avg_amt,
                   COUNT(*) as freq
            FROM transactions
            WHERE user_id=? AND direction='debit'
            AND date >= CURRENT_DATE - INTERVAL 90 DAY
            GROUP BY merchant, category
            HAVING COUNT(*) >= 2
            ORDER BY avg_amt DESC
        """, [user["user_id"]]).fetchall()

        zombie = []
        for r in recurring:
            other_activity = con.execute("""
                SELECT COUNT(*) FROM transactions
                WHERE user_id=? AND category=?
                AND merchant != ?
                AND date >= CURRENT_DATE - INTERVAL 30 DAY
            """, [user["user_id"], r[1], r[0]]).fetchone()[0]
            if other_activity == 0:
                zombie.append({
                    "merchant": r[0], "category": r[1],
                    "monthly_cost": round(r[2], 2), "type": "zombie_subscription"
                })

        # Algorithm 2: Duplicate Services
        streaming_keywords = ['netflix','spotify','prime','hotstar',
                               'youtube','apple music','gaana']
        duplicates = []
        found = [r[0].lower() for r in recurring
                 if any(k in r[0].lower() for k in streaming_keywords)]
        if len(found) >= 2:
            duplicates.append({
                "services": found, "type": "duplicate_streaming",
                "message": f"You have {len(found)} streaming services: {', '.join(found)}"
            })

        # Algorithm 3: Micro-leaks
        micro = con.execute("""
            SELECT merchant, AVG(amount) as avg_amt, COUNT(*) as freq
            FROM transactions
            WHERE user_id=? AND direction='debit'
            AND amount < 150
            AND date >= CURRENT_DATE - INTERVAL 90 DAY
            GROUP BY merchant HAVING COUNT(*) >= 2
        """, [user["user_id"]]).fetchall()

        micro_leaks = [{
            "merchant": m[0],
            "monthly_cost": round(m[1], 2),
            "annual_cost":  round(m[1] * 12, 2),
            "type": "micro_leak"
        } for m in micro]

        # Algorithm 4: Price Drift
        price_drift = con.execute("""
            SELECT merchant,
                   AVG(amount) as recent_avg,
                   MIN(amount) as historical_min
            FROM transactions
            WHERE user_id=? AND direction='debit'
            AND date >= CURRENT_DATE - INTERVAL 90 DAY
            GROUP BY merchant HAVING COUNT(*) >= 3
        """, [user["user_id"]]).fetchall()

        drift_alerts = []
        for p in price_drift:
            if p[1] > p[2] * 1.05:
                increase = round(((p[1] - p[2]) / p[2]) * 100, 1)
                drift_alerts.append({
                    "merchant":   p[0],
                    "old_amount": round(p[2], 2),
                    "new_amount": round(p[1], 2),
                    "increase_pct": increase,
                    "type": "price_drift"
                })

        total_monthly_waste = (
            sum(z['monthly_cost'] for z in zombie) +
            sum(m['monthly_cost'] for m in micro_leaks)
        )

        return {
            "zombie_subscriptions": zombie,
            "duplicate_services":   duplicates,
            "micro_leaks":          micro_leaks[:5],
            "price_drift_alerts":   drift_alerts[:5],
            "total_monthly_waste":  round(total_monthly_waste, 2),
            "total_annual_waste":   round(total_monthly_waste * 12, 2)
        }
    finally:
        con.close()