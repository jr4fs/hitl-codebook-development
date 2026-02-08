import re
from typing import Dict, Any, List, Optional, Tuple


# ---------- helpers ----------
def wrap(token: str, brackets: bool) -> str:
    return f"[{token}]" if brackets else token

def preserve_case(orig: str, repl: str) -> str:
    if orig.isupper(): return repl.upper()
    if orig.istitle(): return repl.title()
    if orig.islower(): return repl.lower()
    return repl


# ---------- Base ----------
class BaseRule:
    def __init__(self, cfg: Dict[str, Any], opts: Dict[str, Any], resources: Dict[str, Any]):
        self.cfg = cfg
        self.opts = opts
        self.res = resources

    def apply(self, text: str) -> str:
        raise NotImplementedError


# ---------- PhraseProtectRule ----------
class PhraseProtectRule(BaseRule):
    """
    Protect specific multi-word phrases by pre-tokenizing them, then replacing with final tags.
    config:
      type: phrase_protect
      phrases:
        - text: "NH"
          replacement: PERSON
        - text: "mercy medical"
          replacement: ORG
    """
    def __init__(self, cfg, opts, res):
        super().__init__(cfg, opts, res)
        self.pairs: List[Tuple[re.Pattern, str, str]] = []  # (rx, token, final)
        for item in cfg.get("phrases", []):
            text = item["text"]
            final = item["replacement"]
            token = f"__PROTECT__{text.upper().replace(' ','_')}__"
            rx = re.compile(rf"(?i)\b{re.escape(text)}\b")
            self.pairs.append((rx, token, final))

    def apply(self, text: str) -> str:
        if not text: return text
        # protect
        for rx, token, _ in self.pairs:
            text = rx.sub(token, text)
        # unprotect to final
        for _, token, final in self.pairs:
            text = text.replace(token, wrap(final, self.opts.get("placeholder_brackets", True)))
        return text


# ---------- RegexRule ----------
class RegexRule(BaseRule):
    """
    config:
      type: regex
      patterns:
        - pattern: "(?i)\\b[\\w.\\-]+@[\\w\\-]+\\.[\\w.\\-]+\\b"
          replacement: EMAIL
          enable: true
        - pattern: "..."
          replacement: PHONE
          enable: true
    """
    def __init__(self, cfg, opts, res):
        super().__init__(cfg, opts, res)
        self.specs = []
        for it in cfg.get("patterns", []):
            if it.get("enable", True):
                self.specs.append((re.compile(it["pattern"]), it.get("replacement","REDACTED")))

    def apply(self, text: str) -> str:
        if not text: return text
        for rx, rep in self.specs:
            text = rx.sub(wrap(rep, self.opts.get("placeholder_brackets", True)), text)
        return text


# ---------- NameListRule (simple exact names) ----------
class NameListRule(BaseRule):
    """
    config:
      type: name_list
      names_path: data/names.csv   # one column header: name
      placeholder: PERSON
    """
    def __init__(self, cfg, opts, res):
        super().__init__(cfg, opts, res)
        self.placeholder = cfg.get("placeholder", "PERSON")
        path = cfg.get("names_path") or res.get("names_list_path")
        names: List[str] = []
        if path:
            try:
                import csv
                with open(path, encoding="utf-8") as f:
                    for row in csv.DictReader(f):
                        n = (row.get("name") or "").strip()
                        if n:
                            names.append(n)
            except Exception:
                pass
        # longest first to avoid partials
        names = sorted(set(names), key=len, reverse=True)
        esc = [re.escape(n) for n in names if len(n) > 1]
        self.rx = re.compile(rf"(?i)\b(?:{'|'.join(esc)})\b(?=$|[^A-Za-z0-9_’']|[’']s)") if esc else None

    def apply(self, text: str) -> str:
        if not text or not self.rx: return text
        def _sub(m):
            rep = self.placeholder
            if self.opts.get("case_preserve_replacements", True):
                rep = preserve_case(m.group(0), rep)
            return wrap(rep, self.opts.get("placeholder_brackets", True))
        return self.rx.sub(_sub, text)


# ---------- StructuredNamesRule (parity with build_row_name_patterns) ----------
class StructuredNamesRule(BaseRule):
    """
    Replicates the First/Middle/Last patterns (incl. initials, possessives, and 'First M.' without last).
    config:
      type: structured_names
      csv_path: data/provided_names.csv
      first_col: "First Name"
      middle_col: "Middle Name"
      last_col: "Last Name"
      other_prefix: "Other Name"   # scans Other Name 1..5
      skip_tokens: ["at","as","side"]  # like SKIP_NAME_TOKENS
      placeholder: PERSON
      catch_first_middle_initial_no_last: true
    """
    def __init__(self, cfg, opts, res):
        super().__init__(cfg, opts, res)
        self.placeholder = cfg.get("placeholder","PERSON")
        self.skip = set([s.lower() for s in cfg.get("skip_tokens", ["at","as","side"])])
        self.fm_only = bool(cfg.get("catch_first_middle_initial_no_last", True))
        # self.any_mid_initial = bool(cfg.get("first_any_middle_initial_no_last", False))
        self.any_mid_initial = bool(cfg.get("first_any_middle_initial_no_last", False))
        self.redact_mid_initial_alone = bool(cfg.get("redact_standalone_middle_initial", False))

        path = cfg.get("csv_path") or res.get("names_structured_path")
        self.patterns: List[re.Pattern] = []
        if path:
            import pandas as pd
            df = pd.read_csv(path)
            fcol = cfg.get("first_col","First Name")
            mcol = cfg.get("middle_col","Middle Name")
            lcol = cfg.get("last_col","Last Name")
            opfx = cfg.get("other_prefix","Other Name")
            other_cols = [c for c in df.columns if c.lower().startswith(opfx.lower())]
            for _, row in df.iterrows():
                first  = str(row.get(fcol,"") or "").strip()
                middle = str(row.get(mcol,"") or "").strip()
                last   = str(row.get(lcol,"") or "").strip()
                if first.lower() in self.skip: first=""
                if middle.lower() in self.skip: middle=""
                if last.lower() in self.skip: last=""
                others = []
                for c in other_cols:
                    val = str(row.get(c,"") or "").strip()
                    if val and val.lower() not in self.skip:
                        others.append(val)
                self.patterns.extend(self._build_patterns(first, middle, last, others))

    def _tail_ok(self, allow_possessive=True):
        return r"(?=$|[^A-Za-z0-9_’']|[’']s)" if allow_possessive else r"(?=$|[^A-Za-z0-9_’'])"

    def _add_whole_word(self, pats: List[re.Pattern], name: str, allow_possessive=True):
        if name and len(name) > 1:
            rx = re.compile(rf"(?i)\b{re.escape(name)}\b{self._tail_ok(allow_possessive)}")
            pats.append(rx)

    def _add_pair_possessive(self, pats: List[re.Pattern], a: str, b: str, sep=r"\s+"):
        rx = re.compile(rf"(?i)\b{re.escape(a)}{sep}{re.escape(b)}\b(?:[’']s)?")
        pats.append(rx)

    def _build_patterns(self, first: str, middle: str, last: str, others: List[str]) -> List[re.Pattern]:
        pats: List[re.Pattern] = []
        # standalone
        if first:  self._add_whole_word(pats, first, allow_possessive=False)
        if last:   self._add_whole_word(pats, last,  allow_possessive=True)
        if middle and len(middle) > 1:
            self._add_whole_word(pats, middle, allow_possessive=True)
        for on in others:
            if len(on) > 1:
                self._add_whole_word(pats, on, allow_possessive=True)
        # combos
        if first and last:
            fi = first[0]
            self._add_pair_possessive(pats, first, last)
            if middle:
                if len(middle) == 1:
                    pats.append(re.compile(rf"(?i)\b{re.escape(first)}\s+{re.escape(middle)}\.?\s+{re.escape(last)}\b(?:[’']s)?"))
                    pats.append(re.compile(rf"(?i)\b{re.escape(fi)}\.?\s+{re.escape(middle)}\.?\s+{re.escape(last)}\b(?:[’']s)?"))
                    pats.append(re.compile(rf"(?i)\b{re.escape(fi)}\.?\s+{re.escape(last)}\b(?:[’']s)?"))
                else:
                    mi = middle[0]
                    pats.append(re.compile(rf"(?i)\b{re.escape(first)}\s+{re.escape(middle)}\s+{re.escape(last)}\b(?:[’']s)?"))
                    pats.append(re.compile(rf"(?i)\b{re.escape(first)}\s+{re.escape(mi)}\.?\s+{re.escape(last)}\b(?:[’']s)?"))
                    pats.append(re.compile(rf"(?i)\b{re.escape(fi)}\.?\s+{re.escape(mi)}\.?\s+{re.escape(last)}\b(?:[’']s)?"))
                    pats.append(re.compile(rf"(?i)\b{re.escape(fi)}\.?\s+{re.escape(last)}\b(?:[’']s)?"))
        # "First M." without last
        if self.fm_only and first and middle and len(middle) == 1:
            pats.append(re.compile(rf"(?i)\b{re.escape(first)}\s+{re.escape(middle)}\.?(?=\b|[^A-Za-z])"))
            pats.append(re.compile(rf"(?i)\b{re.escape(first[0])}\.?\s*{re.escape(middle)}\.?(?=\b|[^A-Za-z])"))
        # if self.any_mid_initial and first and not middle:
        #     # e.g., "Jay S." or "Jay S"
        #     pats.append(re.compile(rf"(?i)\b{re.escape(first)}\s+[A-Za-z]\.?(?=\b|[^A-Za-z])"))
        # 1) Catch "First X." even when middle isn't in CSV (broader, optional)
        if self.any_mid_initial and first and not middle:
            pats.append(re.compile(rf"(?i)\b{re.escape(first)}\s+[A-Za-z]\.?(?=\b|[^A-Za-z])"))

        # 2) Redact a standalone middle initial token (only if this CSV row sets it)
        if self.redact_mid_initial_alone and middle and len(middle) == 1:
            # Match 'S' or 'S.' as a standalone word (avoids hitting random letters inside words)
            pats.append(re.compile(rf"(?i)\b{re.escape(middle)}\.?\b"))

        return pats

    def apply(self, text: str) -> str:
        if not text: return text
        out = text
        for rx in self.patterns:
            out = rx.sub(wrap(self.cfg.get("placeholder","PERSON"), self.opts.get("placeholder_brackets", True)), out)
        return out


# ---------- IDAlnumRule ----------
class IDAlnumRule(BaseRule):
    """
    Redact mixed alphanumeric IDs like D9C8DB1BC.

    config:
      type: id_alnum
      min_len: 6
      placeholder: CASEID
      exclude_terms: ["covid", "covid19", "covid-19", "covid19.", "covid-19."]  # optional
    """
    def __init__(self, cfg, opts, res):
        super().__init__(cfg, opts, res)
        self.min_len = cfg.get("min_len", 6)
        self.placeholder = cfg.get("placeholder", "CASEID")

        # terms we should *not* redact even if they look like IDs
        # we'll compare lowercase, and we'll strip punctuation like trailing "." or "," when checking
        self.excludes = set(t.lower() for t in cfg.get("exclude_terms", []))

        # regex that matches any alphanumeric run containing at least one digit AND one letter,
        # length >= min_len
        self.rx = re.compile(
            rf"\b(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{{{self.min_len},}}\b"
        )

    def apply(self, text: str) -> str:
        if not text:
            return text

        def _sub(m):
            token = m.group(0)
            
            # Skip if this is inside an already-replaced placeholder
            start = m.start()
            if start > 0 and text[start - 1] == '[':
                return token

            # normalize token for comparison (lowercase, remove trailing punctuation like . , ; :)
            norm = re.sub(r"[^\w-]+$", "", token).lower()

            # if the normalized token matches one of the excluded terms, skip redaction
            if norm in self.excludes:
                return token

            # otherwise redact
            return wrap(self.placeholder, self.opts.get("placeholder_brackets", True))

        return self.rx.sub(_sub, text)


# ---------- PronounRule ----------
class PronounRule(BaseRule):
    """
    config:
      type: pronoun
      enable: false
      pronouns: ["she","her","hers","he","him","his","they","them","theirs","ze","zir","xe","xem","xyr"]
      placeholder: PRONOUN
    """
    def __init__(self, cfg, opts, res):
        super().__init__(cfg, opts, res)
        self.enabled = cfg.get("enable", False)
        self.placeholder = cfg.get("placeholder","PRONOUN")
        if not self.enabled:
            self.rx = None
            return
        pronouns = [p for p in cfg.get("pronouns", []) if p]
        esc = [re.escape(p) for p in pronouns]
        self.rx = re.compile(rf"(?i)\b(?:{'|'.join(esc)})\b") if esc else None

    def apply(self, text: str) -> str:
        if not text or not self.rx or not self.enabled: return text
        def _s(m):
            # Always use uppercase placeholder for pronouns
            return wrap(self.placeholder.upper(), self.opts.get("placeholder_brackets", True))
        return self.rx.sub(_s, text)


# ---------- PresidioFilteredRule ----------
class PresidioFilteredRule(BaseRule):
    """
    Optional: mirrors your AnalyzerEngine behavior (no LMs).
    Requires presidio-analyzer & presidio-anonymizer & spacy if enabled.

    config:
      type: presidio_filtered
      enable: false
      date_exempt_terms: ["morning","afternoon","evening","night","tonight","today","yesterday","tomorrow","year","years","hour","hours","minute","minutes"]
      skip_words: ["at","as","side"]
      placeholder_map:
        PERSON: PERSON
        LOCATION: LOCATION
        ORGANIZATION: ORG
        EMAIL_ADDRESS: EMAIL
        PHONE_NUMBER: PHONE
        CREDIT_CARD: CREDIT_CARD
        DATE: DATE
        DATE_TIME: DATE
        NUMBER: NUMBER
      special_map: {"DPSS": "AGENCY"}  # post-fix mapping like old DPSS_TOKEN
    """
    def __init__(self, cfg, opts, res):
        super().__init__(cfg, opts, res)
        self.enabled = bool(cfg.get("enable", False))
        if not self.enabled:
            self.available = False
            return
        try:
            from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
            from presidio_analyzer.nlp_engine import NlpEngineProvider
            from presidio_anonymizer import AnonymizerEngine
            from presidio_anonymizer.entities import OperatorConfig
        except Exception:
            self.available = False
            return
        self.time_rx = re.compile(
            r"""(?ix)
            ^                    # start of the span
            (?:
                (?:[01]?\d|2[0-3])        # hour 0-23 or 1-12 etc.
                (?:
                    :[0-5]\d              # optional :mm
                )?
                \s*
                (?:a\.?m\.?|p\.?m\.?)?    # optional am/pm variants
            |
                (?:[01]?\d|2[0-3])\s*(?:a\.?m\.?|p\.?m\.?)  # like '3pm', '11 am'
            )
            $                    # end of the span
            """
        )
        self.available = True
        self.placeholder_map = cfg.get("placeholder_map", {})
        self.date_exempt = set([w.lower() for w in cfg.get("date_exempt_terms", [])])
        self.skip_words = set([w.lower() for w in cfg.get("skip_words", [])])
        self.skip_entities = set(cfg.get("skip_entities", []))
        self.special_map = {k.lower(): v for k,v in (cfg.get("special_map") or {}).items()}
        self.allow_terms = set([
            "yp","hcm","dop","adop","dim","ldia","sbc","hwm","csw","hcm/csw","tcm",
            "shm","shco","shc","tem","tec","eecm","mswi","ed",
            "iccm","hwcm",
            "covid","covid19","covid-19",
            "bbq",
            "mfp","dod","lshc", 
            # (duplicates in lowercase so we don't miss variants)
            "hcm/csw",
            # if you have a composite like "adop ek", include it explicitly:
            "adop ek"
        ])
        # self.allow_terms = set([ "yp","hcm","dop","adop","dim","ldia","sbc","hwm","csw","hcm/csw","tcm", "shm","shco","shc","tem","tec","eecm","mswi","ed", "iccm","hwcm", "covid","covid19","covid-19", "bbq", "DOD", "LSHC", "MFP", "YP","HCM","DOP","ADOP", "ADOP EK", "DIM","LDIA","SBC","HWM","CSW","HCM/CSW","TCM","SHM","SHCO","SHC","TEM","TEC","EECM","MSWI","ED","ICCM","HWCM","COVID","COVID-19","COVID19","BBQ" ])

        # NLP engine
        provider = NlpEngineProvider(nlp_configuration={
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "en", "model_name": "en_core_web_lg"}],
        })
        self.analyzer = AnalyzerEngine(nlp_engine=provider.create_engine(), supported_languages=["en"])
        self.anonymizer = AnonymizerEngine()

    def apply(self, text: str) -> str:
        if not text or not self.available: return text
        results = self.analyzer.analyze(text=text, language="en")

        filtered = []
        for r in results:
            span = text[r.start:r.end]
            low = span.strip().lower()
            
            # Skip entity types that are disabled via toggles
            if r.entity_type in self.skip_entities:
                continue
            
            # Skip already-replaced placeholders (text wrapped in [...])
            if re.search(r'\[.+?\]', span):
                continue
            
            # 0) Never redact allowlisted acronyms/markers like YP, COVID19, BBQ
            if low in self.allow_terms:
                continue

            # 1) If we've already replaced this with a custom placeholder like [CASEID],
            #    do not let Presidio touch it again.
            if "caseid" in low or "[caseid]" in low:
                continue

            # (C) Skip DATE/DATE_TIME for natural time expressions we don't want redacted
            if r.entity_type in {"DATE","DATE_TIME"}:
                # 1. If this span looks like a clock time (3pm, 10:45 a.m.), skip it
                if self.time_rx.search(span.strip()):
                    continue

                # 2. If this span includes any words from the exempt list (today, afternoon, weekend...), skip it
                span_tokens = [tok.strip("'\"") for tok in re.findall(r"[A-Za-z']+", low)]
                if any(tok in self.date_exempt for tok in span_tokens if tok):
                    continue

            # Skip words we never want as entities
            if low in self.skip_words:
                continue
            # if the span contains ANY kept token, skip the whole span
            span_tokens = re.findall(r"[A-Za-z/]+", span.lower())
            if any(tok in self.allow_terms for tok in span_tokens):
                continue

            filtered.append(r)

        # Build operator map
        try:
            from presidio_anonymizer.entities import OperatorConfig
        except Exception:
            return text
        operators = {}
        for ent, tag in self.placeholder_map.items():
            operators[ent] = OperatorConfig("replace", {"new_value": wrap(tag, self.opts.get("placeholder_brackets", True))})

        out = self.anonymizer.anonymize(text=text, analyzer_results=filtered, operators=operators).text

        # Apply special remaps (e.g., DPSS -> [AGENCY])
        for tok, tag in self.special_map.items():
            out = re.sub(rf"(?i)\b{re.escape(tok)}\b", wrap(tag, self.opts.get("placeholder_brackets", True)), out)
        return out


class AgeRule(BaseRule):
    """
    Redact ages like 'age 61' -> 'age[AGE]'.
    We only touch numbers that directly follow the word 'age' (case-insensitive),
    optionally with punctuation or colon.

    config:
      type: age
      enable: true
      placeholder: AGE
    """

    def __init__(self, cfg, opts, res):
        super().__init__(cfg, opts, res)
        self.enabled = cfg.get("enable", True)
        self.placeholder = cfg.get("placeholder", "AGE")
        # matches: age 61 / Age: 14 / AGE- 2
        # group 1 = "age" (keep), group 2 = the number
        self.rx = re.compile(
            r"(?i)\b(age)\s*[:\-]?\s*(\d{1,3})\b"
        )

    def apply(self, text: str) -> str:
        if not text or not self.enabled:
            return text

        def _sub(m):
            age_word = m.group(1)        # "age" with original case
            num = m.group(2)             # "61"
            # build replacement: keep "age", redact just number
            repl_num = wrap("AGE", self.opts.get("placeholder_brackets", True))
            return f"{age_word}{repl_num}"

        return self.rx.sub(_sub, text)


class KeepPossessiveGuardRule(BaseRule):
    """
    Strip possessive 's from keep-words so later name/initial rules can't
    interpret the trailing 's as a standalone initial.
    config:
      type: keep_possessive_guard
      keep_words: ["MFP","SHC","LSHC","DOD", ...]  # case-insensitive
    """
    def __init__(self, cfg, opts, res):
        super().__init__(cfg, opts, res)
        keep = [w for w in cfg.get("keep_words", []) if w]
        # build a case-insensitive alternation; longest first to avoid partials
        keep = sorted(set(keep), key=len, reverse=True)
        if keep:
            alt = "|".join(re.escape(k) for k in keep)
            # \b(KEEP)(['’]s)\b  -> return just \1 (the keep token), dropping possessive
            self.rx = re.compile(rf"(?i)\b({alt})([’']s)\b")
        else:
            self.rx = None

    def apply(self, text: str) -> str:
        if not text or not self.rx:
            return text
        # preserve original case of the core keep token; drop the possessive entirely
        return self.rx.sub(lambda m: m.group(1), text)


# ---------- Factory ----------
RULE_TYPES = {
    "phrase_protect": PhraseProtectRule,
    "regex": RegexRule,
    "age": AgeRule,
    "name_list": NameListRule,
    "structured_names": StructuredNamesRule,
    "id_alnum": IDAlnumRule,
    "pronoun": PronounRule,
    "presidio_filtered": PresidioFilteredRule,
    "keep_possessive_guard": KeepPossessiveGuardRule,
}

def build_rules(cfg_rules: List[Dict[str, Any]], opts: Dict[str, Any], res: Dict[str, Any]):
    rules = []
    for item in cfg_rules:
        typ = item.get("type")
        cls = RULE_TYPES.get(typ)
        if not cls:
            continue
        rules.append(cls(item, opts, res))
    return rules
