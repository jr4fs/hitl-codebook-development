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


    def sample(self, n: int = 5, text_col: str = "text_combined") -> pd.DataFrame:
        if self.rep_sample_df.empty:
            return self.candidate_df.sample(n=min(n, len(self.rep_sample_df)))

        # Step 1: seed with 1 random sample
        seed = self.rep_sample_df.sample(n=1, random_state=42)
        self.candidate_df = seed.copy()
        self.rep_sample_df = self.rep_sample_df.drop(index=seed.index).reset_index(drop=True)

        # Step 2: iteratively add least similar samples
        count = 1
        while len(self.candidate_df) < n and not self.rep_sample_df.empty:
            candidate_texts = self.candidate_df[text_col].tolist()
            guide_texts = self.rep_sample_df[text_col].tolist()

            # score all remaining rep_sample rows against current candidate set
            scores = self.calculate_coverage(guide_texts, candidate_texts)

            # pick the least similar (lowest coverage score)
            best_idx = np.argmin(scores)
            best_row = self.rep_sample_df.iloc[[best_idx]]

            # move it from rep_sample_df to candidate_df
            self.candidate_df = pd.concat([self.candidate_df, best_row], ignore_index=True)
            self.rep_sample_df = self.rep_sample_df.drop(index=self.rep_sample_df.index[best_idx]).reset_index(drop=True)
            count += 1
            print("Picked: ",count)

        return self.candidate_df
