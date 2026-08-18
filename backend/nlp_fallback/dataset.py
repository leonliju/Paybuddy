"""
Synthetic stratified pilot dataset for training the Stage 3 NLP fallback
classifier described in the NLP project report.

Stage 3 only ever runs on transaction text that already failed both the
merchant-dictionary (Stage 1) and keyword-regex (Stage 2) lookups in
transactions.py, so the highest-value training signal is TIER_INDIRECT:
transaction phrasing with no explicit dictionary/regex keyword at all.
TIER_DICT and TIER_KEYWORD rows are included too (in smaller numbers) purely
to help the model learn general category-language associations; in
production those rows would already be resolved before Stage 3 ever runs.

This dataset is authored here from scratch -- it is NOT the original
474-row dataset from the NLP report (that dataset's model/CSV artifacts
were never handed over; see the report's own placeholder link in section
4.5). It follows the same three-tier design and the same nine-category
taxonomy, but is a smaller, freshly-written set. Treat it as a starting
pilot fixture: expand it with real corrected transactions over time
(the /categorisation/overrides table is one natural source once PayBuddy
has been used for a while), and retrain periodically.

'Other' is deliberately excluded as a training label. There's no coherent
lexical signature for "not clearly any specific category" -- it's an
abstention bucket, not a class -- so the classifier is trained on the
eight substantive categories and the caller (categorise() in
transactions.py) decides whether to trust a low-confidence prediction or
fall through to 'Other' itself.
"""

TIER_DICT = "dict_coverable"
TIER_KEYWORD = "keyword_coverable"
TIER_INDIRECT = "semantically_indirect"

# (text, category, tier)
_ROWS = [
    # ---------------------------------------------------------------- Food
    ("Swiggy order for dinner", "Food", TIER_DICT),
    ("Zomato lunch delivery", "Food", TIER_DICT),
    ("Paid Dominos for pizza", "Food", TIER_DICT),
    ("Restaurant bill after dinner with friends", "Food", TIER_KEYWORD),
    ("Breakfast at the hotel buffet", "Food", TIER_KEYWORD),
    ("Cafe visit for coffee and snacks", "Food", TIER_KEYWORD),
    ("Grabbed a quick bite between meetings", "Food", TIER_INDIRECT),
    ("Split the tab at the new place downtown", "Food", TIER_INDIRECT),
    ("Ordered in because I didn't feel like cooking", "Food", TIER_INDIRECT),
    ("Weekend brunch with the family", "Food", TIER_INDIRECT),
    ("Late night cravings, ended up ordering something", "Food", TIER_INDIRECT),
    ("Treated myself after a long week", "Food", TIER_INDIRECT),
    ("Paid for the office catering today", "Food", TIER_INDIRECT),
    ("Bought snacks for the movie night at home", "Food", TIER_INDIRECT),
    ("Quick coffee run before the meeting", "Food", TIER_INDIRECT),
    ("Paid the tip and the bill together", "Food", TIER_INDIRECT),
    ("Takeaway because the kitchen's a mess today", "Food", TIER_INDIRECT),
    ("Dinner date at the place near the mall", "Food", TIER_INDIRECT),
    ("Got dessert after the meal", "Food", TIER_INDIRECT),
    ("Paid for everyone's meal this time", "Food", TIER_INDIRECT),
    ("Stopped for something to eat on the way back", "Food", TIER_INDIRECT),
    ("Ordered from the place we always go to", "Food", TIER_INDIRECT),
    ("Got takeout since I was too tired to cook", "Food", TIER_INDIRECT),
    ("Paid for the office lunch order", "Food", TIER_INDIRECT),
    ("Grabbed something quick between classes", "Food", TIER_INDIRECT),
    ("Treated the team after the deadline", "Food", TIER_INDIRECT),
    ("Ordered dessert to celebrate", "Food", TIER_INDIRECT),
    ("Paid at the counter for a snack", "Food", TIER_INDIRECT),
    ("Family dinner out to celebrate the occasion", "Food", TIER_INDIRECT),
    ("Bought ingredients and cooked a big meal", "Food", TIER_INDIRECT),
    ("Late order because we lost track of time", "Food", TIER_INDIRECT),

    # -------------------------------------------------------------- Travel
    ("Uber ride to the airport", "Travel", TIER_DICT),
    ("Ola cab booking for office", "Travel", TIER_DICT),
    ("IRCTC ticket booking", "Travel", TIER_DICT),
    ("Flight ticket booked for the trip", "Travel", TIER_KEYWORD),
    ("Metro card recharge", "Travel", TIER_KEYWORD),
    ("Fuel for the car this week", "Travel", TIER_KEYWORD),
    ("Paid the driver for dropping me home", "Travel", TIER_INDIRECT),
    ("Toll charges on the highway", "Travel", TIER_INDIRECT),
    ("Booked a ride to avoid the traffic", "Travel", TIER_INDIRECT),
    ("Parking charges near the office", "Travel", TIER_INDIRECT),
    ("Weekend getaway transport costs", "Travel", TIER_INDIRECT),
    ("Shared a ride with a colleague and split it", "Travel", TIER_INDIRECT),
    ("Paid for the rickshaw back from the station", "Travel", TIER_INDIRECT),
    ("Booked tickets for the trip next month", "Travel", TIER_INDIRECT),
    ("Reached late because of traffic, took a cab instead", "Travel", TIER_INDIRECT),
    ("Airport pickup charge", "Travel", TIER_INDIRECT),
    ("Rented a bike for the day", "Travel", TIER_INDIRECT),
    ("Paid for the intercity bus", "Travel", TIER_INDIRECT),
    ("Booked a seat for the overnight journey", "Travel", TIER_INDIRECT),
    ("Paid the auto driver double for the late hour", "Travel", TIER_INDIRECT),
    ("Car service and repair costs", "Travel", TIER_INDIRECT),
    ("Booked a ride share to split costs with a colleague", "Travel", TIER_INDIRECT),
    ("Paid for the ferry crossing", "Travel", TIER_INDIRECT),
    ("Missed the bus so booked a cab instead", "Travel", TIER_INDIRECT),
    ("Paid the excess baggage fee at check-in", "Travel", TIER_INDIRECT),
    ("Booked transport for the outstation trip", "Travel", TIER_INDIRECT),
    ("Fuel top-up before the long drive", "Travel", TIER_INDIRECT),
    ("Paid for the car wash and detailing", "Travel", TIER_INDIRECT),

    # --------------------------------------------------------------- Bills
    ("Airtel monthly recharge", "Bills", TIER_DICT),
    ("Jio broadband payment", "Bills", TIER_DICT),
    ("Bescom electricity bill", "Bills", TIER_DICT),
    ("Paid the insurance premium this month", "Bills", TIER_KEYWORD),
    ("EMI payment for the loan", "Bills", TIER_KEYWORD),
    ("Rent transfer to landlord", "Bills", TIER_KEYWORD),
    ("Monthly payment for the internet connection", "Bills", TIER_INDIRECT),
    ("Water charges for the apartment", "Bills", TIER_INDIRECT),
    ("Society maintenance for this month", "Bills", TIER_INDIRECT),
    ("Cleared the phone connection dues", "Bills", TIER_INDIRECT),
    ("Paid off the credit card statement", "Bills", TIER_INDIRECT),
    ("Gas cylinder payment", "Bills", TIER_INDIRECT),
    ("Monthly instalment cleared today", "Bills", TIER_INDIRECT),
    ("DTH connection renewal", "Bills", TIER_INDIRECT),
    ("Cleared the pending house dues", "Bills", TIER_INDIRECT),
    ("Paid the annual premium in one go", "Bills", TIER_INDIRECT),
    ("Cleared this month's connection charges", "Bills", TIER_INDIRECT),
    ("Auto-debit went through for the loan", "Bills", TIER_INDIRECT),
    ("Paid the pending balance on the account", "Bills", TIER_INDIRECT),
    ("Settled the apartment dues for the quarter", "Bills", TIER_INDIRECT),
    ("Cleared the outstanding amount before the due date", "Bills", TIER_INDIRECT),
    ("Renewed the yearly policy", "Bills", TIER_INDIRECT),
    ("Paid for the maintenance contract renewal", "Bills", TIER_INDIRECT),
    ("Cleared last month's carried-over balance", "Bills", TIER_INDIRECT),
    ("Standing instruction went through as usual", "Bills", TIER_INDIRECT),

    # ------------------------------------------------------------ Shopping
    ("Amazon order for household items", "Shopping", TIER_DICT),
    ("Flipkart purchase of a new phone case", "Shopping", TIER_DICT),
    ("Myntra order for clothes", "Shopping", TIER_DICT),
    ("Bought groceries at the local mart", "Shopping", TIER_KEYWORD),
    ("Store purchase for home essentials", "Shopping", TIER_KEYWORD),
    ("Online order delivered today", "Shopping", TIER_KEYWORD),
    ("Picked up a few things from the neighbourhood shop", "Shopping", TIER_INDIRECT),
    ("Bought a gift for a friend's birthday", "Shopping", TIER_INDIRECT),
    ("Impulse buy while browsing online", "Shopping", TIER_INDIRECT),
    ("Replaced my old headphones", "Shopping", TIER_INDIRECT),
    ("Got new curtains for the living room", "Shopping", TIER_INDIRECT),
    ("Paid the local vendor for vegetables", "Shopping", TIER_INDIRECT),
    ("Bought a new bag for the trip", "Shopping", TIER_INDIRECT),
    ("Picked up some stationery for work", "Shopping", TIER_INDIRECT),
    ("Ordered a charger since mine stopped working", "Shopping", TIER_INDIRECT),
    ("Bought decorations for the party", "Shopping", TIER_INDIRECT),
    ("Splurged on shoes I've wanted for a while", "Shopping", TIER_INDIRECT),
    ("Picked up a gadget I saw advertised", "Shopping", TIER_INDIRECT),
    ("Bought new furniture for the room", "Shopping", TIER_INDIRECT),
    ("Grabbed a few things while out running errands", "Shopping", TIER_INDIRECT),
    ("Ordered a replacement part online", "Shopping", TIER_INDIRECT),
    ("Bought a watch as a treat to myself", "Shopping", TIER_INDIRECT),
    ("Picked up paint and supplies for the weekend project", "Shopping", TIER_INDIRECT),
    ("Bought a new mattress since the old one wore out", "Shopping", TIER_INDIRECT),
    ("Got some plants for the balcony", "Shopping", TIER_INDIRECT),
    ("Bought a rug to tie the room together", "Shopping", TIER_INDIRECT),
    ("Picked up a new phone accessory", "Shopping", TIER_INDIRECT),

    # ------------------------------------------------------------ Medical
    ("Apollo pharmacy bill", "Medical", TIER_DICT),
    ("Medplus medicine purchase", "Medical", TIER_DICT),
    ("Hospital consultation fee", "Medical", TIER_KEYWORD),
    ("Doctor visit for a checkup", "Medical", TIER_KEYWORD),
    ("Clinic payment for the dental appointment", "Medical", TIER_KEYWORD),
    ("Picked up my prescription today", "Medical", TIER_INDIRECT),
    ("Paid for the blood test", "Medical", TIER_INDIRECT),
    ("Vaccination charges at the clinic", "Medical", TIER_INDIRECT),
    ("Eye checkup and new glasses", "Medical", TIER_INDIRECT),
    ("Paid for physiotherapy session", "Medical", TIER_INDIRECT),
    ("Emergency room visit last night", "Medical", TIER_INDIRECT),
    ("Bought a first aid kit", "Medical", TIER_INDIRECT),
    ("Dental cleaning appointment", "Medical", TIER_INDIRECT),
    ("Paid for my mother's checkup", "Medical", TIER_INDIRECT),
    ("Health supplements for the month", "Medical", TIER_INDIRECT),
    ("Paid for the scan the doctor ordered", "Medical", TIER_INDIRECT),
    ("Follow-up visit after the surgery", "Medical", TIER_INDIRECT),
    ("Bought contact lenses for the month", "Medical", TIER_INDIRECT),
    ("Paid the specialist for the consultation", "Medical", TIER_INDIRECT),
    ("Picked up allergy medication", "Medical", TIER_INDIRECT),
    ("Paid for the therapy session this week", "Medical", TIER_INDIRECT),
    ("Annual health checkup package", "Medical", TIER_INDIRECT),
    ("Bought a thermometer and some basic supplies", "Medical", TIER_INDIRECT),
    ("Paid for my sibling's braces instalment", "Medical", TIER_INDIRECT),

    # ---------------------------------------------------------- Education
    ("Coursera subscription for the course", "Education", TIER_DICT),
    ("Udemy course purchase", "Education", TIER_DICT),
    ("Paid the college tuition fee", "Education", TIER_KEYWORD),
    ("Bought textbooks for the semester", "Education", TIER_KEYWORD),
    ("Exam fee payment", "Education", TIER_KEYWORD),
    ("Enrolled in a new certification program", "Education", TIER_INDIRECT),
    ("Paid for the workshop registration", "Education", TIER_INDIRECT),
    ("Bought study material for the kids", "Education", TIER_INDIRECT),
    ("Signed up for an online class", "Education", TIER_INDIRECT),
    ("School admission charges", "Education", TIER_INDIRECT),
    ("Paid the tutor for this month", "Education", TIER_INDIRECT),
    ("Bought a laptop for coursework", "Education", TIER_INDIRECT),
    ("Library membership renewal", "Education", TIER_INDIRECT),
    ("Paid for the entrance exam application", "Education", TIER_INDIRECT),
    ("Bought a new set of notebooks and supplies", "Education", TIER_INDIRECT),
    ("Registered for the weekend seminar", "Education", TIER_INDIRECT),
    ("Paid the coaching centre fee", "Education", TIER_INDIRECT),
    ("Bought access to an online learning platform", "Education", TIER_INDIRECT),
    ("Paid for my child's school trip", "Education", TIER_INDIRECT),
    ("Renewed my subscription to a research database", "Education", TIER_INDIRECT),
    ("Bought a subscription for interview prep material", "Education", TIER_INDIRECT),
    ("Paid the hostel fee for the semester", "Education", TIER_INDIRECT),
    ("Signed up for a language course", "Education", TIER_INDIRECT),

    # ------------------------------------------------------- Entertainment
    ("Netflix subscription renewal", "Entertainment", TIER_DICT),
    ("Spotify premium payment", "Entertainment", TIER_DICT),
    ("Hotstar annual plan", "Entertainment", TIER_DICT),
    ("Movie tickets for the weekend", "Entertainment", TIER_KEYWORD),
    ("Concert ticket booking", "Entertainment", TIER_KEYWORD),
    ("Gaming purchase online", "Entertainment", TIER_KEYWORD),
    ("Weekend outing with friends", "Entertainment", TIER_INDIRECT),
    ("Booked seats for the show tonight", "Entertainment", TIER_INDIRECT),
    ("Paid for the amusement park entry", "Entertainment", TIER_INDIRECT),
    ("Bowling night with the team", "Entertainment", TIER_INDIRECT),
    ("Subscribed to a new streaming service", "Entertainment", TIER_INDIRECT),
    ("Paid for karaoke night", "Entertainment", TIER_INDIRECT),
    ("Bought a new game to unwind", "Entertainment", TIER_INDIRECT),
    ("Night out at the arcade", "Entertainment", TIER_INDIRECT),
    ("Booked a table for the comedy show", "Entertainment", TIER_INDIRECT),
    ("Went out for a friend's farewell party", "Entertainment", TIER_INDIRECT),
    ("Paid the cover charge at the club", "Entertainment", TIER_INDIRECT),
    ("Booked a boat ride for the weekend", "Entertainment", TIER_INDIRECT),
    ("Bought merchandise at the concert", "Entertainment", TIER_INDIRECT),
    ("Paid for a round of drinks with friends", "Entertainment", TIER_INDIRECT),
    ("Booked a cabin for the weekend trip with friends", "Entertainment", TIER_INDIRECT),
    ("Paid entry for the theme park with the kids", "Entertainment", TIER_INDIRECT),
    ("Bought a new console game to relax after work", "Entertainment", TIER_INDIRECT),
    ("Booked a spot at the trivia night", "Entertainment", TIER_INDIRECT),
    ("Paid for a paintball session with the group", "Entertainment", TIER_INDIRECT),
    ("Went to a late show with friends", "Entertainment", TIER_INDIRECT),

    # -------------------------------------------------------------- Income
    ("Salary credited for the month", "Income", TIER_DICT),
    ("Stipend payment received", "Income", TIER_DICT),
    ("Bonus credited to account", "Income", TIER_KEYWORD),
    ("Payment received for freelance work", "Income", TIER_KEYWORD),
    ("Refund credited from the return", "Income", TIER_INDIRECT),
    ("Got paid for the project I finished", "Income", TIER_INDIRECT),
    ("Cashback credited to the account", "Income", TIER_INDIRECT),
    ("Received money back from a friend", "Income", TIER_INDIRECT),
    ("Interest credited this quarter", "Income", TIER_INDIRECT),
    ("Client transferred the payment today", "Income", TIER_INDIRECT),
    ("Got reimbursed for the travel expense", "Income", TIER_INDIRECT),
    ("Dividend payout received", "Income", TIER_INDIRECT),
    ("Sold an old item and got paid", "Income", TIER_INDIRECT),
    ("Landlord refunded part of the deposit", "Income", TIER_INDIRECT),
    ("Got paid back for splitting the bill earlier", "Income", TIER_INDIRECT),
    ("Received the annual bonus payout", "Income", TIER_INDIRECT),
    ("Freelance client cleared the outstanding invoice", "Income", TIER_INDIRECT),
    ("Received money for the item I sold online", "Income", TIER_INDIRECT),
    ("Got the tax refund credited", "Income", TIER_INDIRECT),
    ("Company reimbursed the conference expenses", "Income", TIER_INDIRECT),
    ("Received a gift transfer from a relative", "Income", TIER_INDIRECT),
    ("Got paid for the tutoring session", "Income", TIER_INDIRECT),
]


def build_dataset():
    """Returns (texts, labels, tiers) as parallel lists."""
    texts = [r[0] for r in _ROWS]
    labels = [r[1] for r in _ROWS]
    tiers = [r[2] for r in _ROWS]
    return texts, labels, tiers


def dataset_summary():
    """Small helper for sanity-checking class/tier balance before training."""
    from collections import Counter
    _, labels, tiers = build_dataset()
    return {
        "total_rows": len(labels),
        "by_category": dict(Counter(labels)),
        "by_tier": dict(Counter(tiers)),
    }


if __name__ == "__main__":
    import json
    print(json.dumps(dataset_summary(), indent=2))
