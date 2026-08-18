"""Shared spaCy-based preprocessing for the Stage 3 NLP fallback classifier.
Used by both train.py (offline) and classifier.py (runtime inference) so
there's a single source of truth for how text is normalised -- training and
inference must preprocess identically or predictions silently degrade."""
import spacy

_NLP = None


def get_spacy():
    global _NLP
    if _NLP is None:
        _NLP = spacy.load("en_core_web_sm", disable=["ner", "parser"])
    return _NLP


def lemmatize(text: str) -> str:
    """Lowercase lemmatization, dropping stopwords/punctuation."""
    doc = get_spacy()(text.lower())
    return " ".join(
        tok.lemma_ for tok in doc
        if not tok.is_stop and not tok.is_punct and not tok.is_space
    )
