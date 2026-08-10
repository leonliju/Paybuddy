from fastapi import APIRouter, Depends
from database import get_connection
from auth import get_current_user
import numpy as np

router = APIRouter()


@router.get("/{category}")
def forecast(category: str, user=Depends(get_current_user)):
    con = get_connection()

    try:
        query = """
            SELECT
                strftime(DATE(date), '%Y-%m') AS month,
                SUM(amount) AS total
            FROM transactions
            WHERE user_id = ?
              AND direction = 'debit'
        """

        params = [user["user_id"]]

        if category.lower() != "all":
            query += " AND category = ?"
            params.append(category)

        query += """
            GROUP BY strftime(DATE(date), '%Y-%m')
            ORDER BY strftime(DATE(date), '%Y-%m')
        """

        rows = con.execute(query, params).fetchall()

    finally:
        con.close()

    if len(rows) < 3:
        return {
            "insufficient_data": True,
            "message": "Need at least 3 months of spending data for forecasting."
        }

    months = [r[0] for r in rows]
    totals = [float(r[1]) for r in rows]

    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import mean_absolute_error

    X = np.arange(len(totals)).reshape(-1, 1)
    y = np.array(totals)

    lr = LinearRegression()
    lr.fit(X[:-1], y[:-1])

    last_prediction = lr.predict(X[-1:])[0]
    next_prediction = lr.predict([[len(totals)]])[0]

    result = {
        "history": [
            {
                "month": m,
                "total": round(t, 2)
            }
            for m, t in zip(months, totals)
        ],
        "lr_forecast": round(max(next_prediction, 0), 2),
        "mae_lr": round(
            mean_absolute_error([y[-1]], [last_prediction]), 2
        ),
        "insufficient_data": False
    }

    if len(totals) >= 6:
        try:
            from statsmodels.tsa.arima.model import ARIMA

            model = ARIMA(y[:-1], order=(1, 1, 1)).fit()
            arima_last = model.forecast(steps=1)[0]

            model2 = ARIMA(y, order=(1, 1, 1)).fit()
            arima_next = model2.forecast(steps=1)[0]

            result["arima_forecast"] = round(max(arima_next, 0), 2)
            result["mae_arima"] = round(
                mean_absolute_error([y[-1]], [arima_last]), 2
            )

        except Exception as e:
            result["arima_error"] = str(e)

    return result