diff --git a/backend/routers/transactions.py b/backend/routers/transactions.py
index ae29674..f130a63 100644
--- a/backend/routers/transactions.py
+++ b/backend/routers/transactions.py
@@ -2,6 +2,7 @@ from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
 from pydantic import BaseModel
 from typing import Optional
 from datetime import datetime
+import re
 import pandas as pd
 import io
 from bs4 import BeautifulSoup
@@ -28,25 +29,51 @@ MERCHANT_DICT = {
     'salary': 'Income', 'stipend': 'Income',
 }
 
+def _normalise(text: str) -> str:
+    """Lowercase, strip punctuation, collapse whitespace."""
+    text = text.lower()
+    text = re.sub(r'[^\w\s]', ' ', text)
+    text = re.sub(r'\s+', ' ', text).strip()
+    return text
+
+# \b-anchored so short keywords only match whole words, e.g. "fee" no longer
+# matches inside "coffee"/"toffee", and "rent" no longer matches inside
+# "parent"/"different".
+CATEGORY_PATTERNS = {
+    'Bills':         re.compile(r'\b(?:bill|recharge|electricity|broadband|emi|insurance|rent)\b'),
+    'Food':          re.compile(r'\b(?:food|restaurant|cafe|hotel|eat|lunch|dinner|breakfast)\b'),
+    'Travel':        re.compile(r'\b(?:travel|cab|auto|bus|train|flight|metro|fuel|petrol)\b'),
+    'Shopping':      re.compile(r'\b(?:shop|store|mart|purchase|order|delivery)\b'),
+    'Medical':       re.compile(r'\b(?:hospital|clinic|pharmacy|doctor|medicine|health)\b'),
+    'Education':     re.compile(r'\b(?:school|college|course|book|exam|fee|tuition)\b'),
+    'Entertainment': re.compile(r'\b(?:movie|cinema|game|concert|event|ticket|fun)\b'),
+    'Income':        re.compile(r'\b(?:salary|credit|income|bonus|stipend|payment received)\b'),
+}
+
 def categorise(description: str, merchant: str) -> tuple:
-    text = f"{description} {merchant}".lower()
+    """
+    Stage 1: merchant-dictionary lookup, checked against both a spaced and a
+    space-stripped normalisation, so UPI-style concatenated merchant
+    references ("AmazonIndia") resolve the same as spaced ones
+    ("Amazon India") for multi-word dictionary keys like "amazon prime".
+
+    Stage 2: boundary-safe (\\b-anchored) keyword regex.
+
+    Stage 3 (statistical NLP fallback) is not yet implemented here; unmatched
+    text still defaults to 'Other' at a flat 0.50 confidence.
+    """
+    norm = _normalise(f"{description} {merchant}")
+    norm_stripped = norm.replace(' ', '')
+
     for keyword, cat in MERCHANT_DICT.items():
-        if keyword in text:
+        keyword_stripped = keyword.replace(' ', '')
+        if keyword in norm or keyword_stripped in norm_stripped:
             return cat, 0.95
-    import re
-    patterns = {
-        'Bills':         r'bill|recharge|electricity|broadband|emi|insurance|rent',
-        'Food':          r'food|restaurant|cafe|hotel|eat|lunch|dinner|breakfast',
-        'Travel':        r'travel|cab|auto|bus|train|flight|metro|fuel|petrol',
-        'Shopping':      r'shop|store|mart|purchase|order|delivery',
-        'Medical':       r'hospital|clinic|pharmacy|doctor|medicine|health',
-        'Education':     r'school|college|course|book|exam|fee|tuition',
-        'Entertainment': r'movie|cinema|game|concert|event|ticket|fun',
-        'Income':        r'salary|credit|income|bonus|stipend|payment received',
-    }
-    for cat, pattern in patterns.items():
-        if re.search(pattern, text):
+
+    for cat, pattern in CATEGORY_PATTERNS.items():
+        if pattern.search(norm):
             return cat, 0.75
+
     return 'Other', 0.50
 
 def fix_date(date_str: str) -> str:
