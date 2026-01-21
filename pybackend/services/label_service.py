from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import faiss 
from sentence_transformers import SentenceTransformer
from sklearn.preprocessing import normalize
from models.embedding_schemas import Label
from tqdm import tqdm

class LabelService:
    def __init__(self, df:pd.DataFrame, model: str, labels: List[Label], n_per_class: Optional[int], index: faiss.Index):
        self.database_df = df
        self.model = "sentence-transformers/all-mpnet-base-v2" if model is None else model
        self.labels: List[Label] = labels
        self.N_PER_CLASS = 40 if n_per_class is None else n_per_class # pick how many examples per label to retrieve
        self.index = index

    def build_queries_for_label(self, label_name: str, keywords: List[str], definition: str) -> List[str]:
        """
        For a given label, return a list of query strings.
        Each keyword becomes its own query. If no keywords, use label + definition.
        """
        kws = [kw.strip() for kw in keywords if kw.strip()]
        queries: List[str] = []

        if kws:
            # simplest: treat each keyword as an independent query
            queries = kws
            # If you want to add context, you could do:
            # queries = [f"{label_name}: {kw}" for kw in kws]
        else:
            # fallback when no keywords: use label + definition as one query
            definition = definition.strip()
            if definition:
                queries = [f"{label_name}: {definition}"]
            else:
                queries = [label_name]

        return queries
    
    def faiss_search_balanced(
        self,
    queries: List[str],
    k: int,
    database_df: pd.DataFrame,
    model: SentenceTransformer,
    index: faiss.Index,
    use_cosine: bool = True,
    random_state: int = 42,
    ) -> pd.DataFrame:
        """
        Search a FAISS index with multiple queries and return ~k results
        balanced across queries.

        Parameters
        ----------
        queries : list of str
            Search queries (e.g., keywords, short phrases).
        k : int
            Total number of results desired across all queries.
        database_df : DataFrame
            The embedding database (must align with FAISS index order).
        model : SentenceTransformer
            Same model used to create the database vectors.
        index : faiss.Index
            Built FAISS index.
        use_cosine : bool
            If True, normalize query vectors to unit length.
        random_state : int
            Seed for reproducible sampling.

        Returns
        -------
        final_results : DataFrame
            Contains at most k rows from database_df with additional 'query' and 'distance' columns.
        """
        np.random.seed(random_state)
        all_results: List[pd.DataFrame] = []

        for q in queries:
            q_vec = model.encode([q], convert_to_numpy=True).astype(np.float32)
            if use_cosine:
                faiss.normalize_L2(q_vec)

            # oversample for each query to give room for dedup
            oversample = max(k * 2, 50)
            distances, ann = index.search(q_vec, oversample)
            distances = distances[0]
            ann = ann[0]

            # normalize distances for nicer scales if you like
            distances = normalize(distances.reshape(1, -1), norm="l2")[0]

            df_q = pd.DataFrame(
                {
                    "distance": distances,
                    "row_id": ann,
                }
            )
            # merge with database via row_id
            merged = df_q.merge(
                database_df,
                left_on="row_id",
                right_on="row_id",
                how="left",
            )
            merged["query"] = q
            all_results.append(merged)

        # If only one query, just return top-k
        if len(queries) == 1:
            result = all_results[0].sort_values("distance", ascending=False).head(k)
            return result.reset_index(drop=True)

        # For multiple queries, balance sampling across them
        num_queries = len(queries)
        base_per_query = max(1, k // num_queries)

        sampled_frames = []
        for df_q in all_results:
            n = min(base_per_query, len(df_q))
            sampled_frames.append(df_q.sample(n=n, random_state=random_state))

        combined = pd.concat(sampled_frames, ignore_index=True)
        # If we still don't have k (e.g., some queries very sparse), fill up using remaining
        if len(combined) < k:
            remaining_pool = (
                pd.concat(all_results, ignore_index=True)
                .drop_duplicates(subset=["row_id"])
            )
            already_ids = set(combined["row_id"].tolist())
            remaining_pool = remaining_pool[~remaining_pool["row_id"].isin(already_ids)]

            missing = k - len(combined)
            if missing > 0 and not remaining_pool.empty:
                extra = remaining_pool.sample(
                    n=min(missing, len(remaining_pool)),
                    random_state=random_state,
                )
                combined = pd.concat([combined, extra], ignore_index=True)

        # Ensure at most k unique results
        combined = combined.drop_duplicates(subset=["row_id"])
        combined = combined.sort_values("distance", ascending=False).head(k)

        return combined.reset_index(drop=True)

    def sample_for_label(
        self,
        label_name: str,
        keywords: List[str],
        definition: str,
        k: int,
        database_df: pd.DataFrame,
        model: SentenceTransformer,
        index: faiss.Index,
    ) -> pd.DataFrame:
        """
        Sample ~k rows for a single label.
        Each keyword for that label becomes its own query, and we balance across them.
        """
        queries = self.build_queries_for_label(label_name, keywords, definition)
        results = self.faiss_search_balanced(
            queries=queries,
            k=k,
            database_df=database_df,
            model=model,
            index=index,
        )
        used_keywords = keywords
        results["label_name"] = label_name
        results.rename(columns={"query": "keyword_used"}, inplace=True)
        results["label_keywords_used"] = ", ".join(used_keywords) if used_keywords else ""
        
        return results
    
    def run_faiss_indexing(self):
        all_results = []
        for label_item in tqdm(self.labels, desc="Processing"):
            res = self.sample_for_label(
            label_name=label_item.name,
            keywords = label_item.keywords,
            definition= label_item.definition,
            k=self.N_PER_CLASS,
            database_df=self.database_df,
            model=self.model,
            index=self.index,
            )
            all_results.append(res)

        results_all = pd.concat(all_results, ignore_index=True)

        return results_all
