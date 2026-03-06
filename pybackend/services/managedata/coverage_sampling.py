import re
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List
import torch

class CoverageBasedSampling:
    SENTENCE_SPLIT_PATTERN = re.compile(r'(?<=[.!?])\s+(?=[A-Z])')
    def __init__(self, df: pd.DataFrame, model: SentenceTransformer):
        self.rep_sample_df = df # D_guide
        self.candidate_df = pd.DataFrame()
        self.device = "mps" if torch.mps.is_available() else "cpu"
        self.model = model.to(self.device)
        self.text_col = "text_combined"

    @staticmethod
    def split_sentences(text: str) -> List[str]:
      """
      Naive sentence splitter: split on punctuation followed by a capital letter.
      Parameters
      ----------
      text: str
         Input text for each sample from the combined text column
      Returns
      ----------
      List of sentences, with whitespace stripped.
      """
      if not isinstance(text, str):
         return []

      # split on .!? + space + capital; keep the punctuation
      parts = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text.strip())
      
      return [s.strip() for s in parts if s.strip()]

    def calculate_coverage(self, candidate_samples: List[str], guide_samples: List[str]) -> np.ndarray:
        """
        Calculates coverage score for each candidate sample relative to guide_samples.
        Optimized via batch encoding.
        """
        if not guide_samples:
            return np.zeros(len(candidate_samples))

        # Prepare and encode guide sentences
        guide_sents = []
        for text in guide_samples:
            guide_sents.extend(self.split_sentences(text))
        
        if not guide_sents:
            return np.zeros(len(candidate_samples))
            
        guide_embeddings = self.model.encode(guide_sents, convert_to_numpy=True) # (M, D)

        # 2. Prepare ALL candidate sentences and track their origins
        all_cand_sents = []
        cand_boundaries = [0]
        for text in candidate_samples:
            sents = self.split_sentences(text)
            all_cand_sents.extend(sents)
            cand_boundaries.append(len(all_cand_sents))
        
        if not all_cand_sents:
            return np.full(len(candidate_samples), float('inf'))

        # Batch encode all candidate sentences
        all_cand_embeddings = self.model.encode(all_cand_sents, convert_to_numpy=True) # (N_total, D)

        # 4. Calculate similarities in one large matrix (optional, memory permitting)
        # or slice per sample to stay safe
        coverage_scores = []
        for i in range(len(candidate_samples)):
            start, end = cand_boundaries[i], cand_boundaries[i+1]
            if start == end:
                coverage_scores.append(float('inf'))
                continue
            
            sample_embeddings = all_cand_embeddings[start:end] # (n_sents, D)
            
            # Similarities between this sample's sentences and all guide sentences
            sim_matrix = cosine_similarity(sample_embeddings, guide_embeddings)
            
            # Max similarity for each candidate sentence
            max_sims = np.max(sim_matrix, axis=1)
            
            # Average max similarity for the sample
            coverage_scores.append(np.mean(max_sims))

        return np.array(coverage_scores)


    def sample(self, text_col: str, n: int = 1) -> pd.DataFrame:
        """
        Selects n samples from candidate_df with LEAST coverage relative to guide_df.
        """
        if self.rep_sample_df.empty:
            # If nothing in guide, fallback to random sampling
            return self.candidate_df.sample(n=min(n, len(self.candidate_df)))

        candidate_texts = self.candidate_df[text_col].tolist()
        guide_texts = self.rep_sample_df[text_col].tolist()

        scores = self.calculate_coverage(candidate_texts, guide_texts)
        
        # Add scores to dataframe for sorting
        temp_df = self.candidate_df.copy()
        temp_df["coverage_score"] = scores
        
        # Select least coverage (most diverse)
        diverse_samples = temp_df.sort_values("coverage_score", ascending=True).head(n)
        
        return diverse_samples.drop(columns=["coverage_score"])
