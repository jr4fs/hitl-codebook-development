import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from sklearn.preprocessing import normalize
import pandas as pd
from typing import List, Tuple


class FAISSService:
    def __init__(self, df, vector_col, use_cosine=True):
        """ 
        Parameters
        ----------
        database_df : DataFrame
            Must contain a column with vectors (list/array).
        vector_col : str
            Name of the column containing vectors.
        use_cosine : bool
            If True, normalize vectors and use inner product as cosine similarity.
        """
        self.database_df = df
        self.vector_col = "vector" if vector_col is None else vector_col
        self.use_cosine = use_cosine
    
    def build_faiss_index(self) -> Tuple[faiss.Index, np.ndarray]:
        """
        Build a FAISS index from the vectors in database_df.
        Returns
        -------
        index : faiss.Index
            FAISS index.
        matrix : np.ndarray
            The matrix of vectors used in the index (after any normalization).
        """
        vectors = np.vstack(self.database_df[self.vector_col].tolist()).astype(np.float32)
        dim = vectors.shape[1]
        print(dim)

        if self.use_cosine:
            # normalize to unit length
            faiss.normalize_L2(vectors)
            index = faiss.IndexFlatIP(dim)
        else:
            index = faiss.IndexFlatL2(dim)

        index.add(vectors)
        return index, vectors
