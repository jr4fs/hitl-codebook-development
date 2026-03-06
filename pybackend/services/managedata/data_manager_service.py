from pathlib import Path

import numpy as np
import pandas as pd
import re
from models.embedding_schemas import EmbedDatasetRequest
import torch
from sentence_transformers import SentenceTransformer
from typing import List, Optional, Tuple
from .rep_sampling import RepresentativeSampling
from .coverage_sampling import CoverageBasedSampling

class DataManagerService:
    def __init__(self, request: EmbedDatasetRequest):
        self.request: EmbedDatasetRequest = request
        self.project_root = Path(__file__).parent.parent.parent
        self.rest_file_path = "/Users/swaminathanchellappa/Desktop/Swaminathan_Chellappa_Stuff/Research/annotation_tool/rest_datasets/"+request.file_path#self.project_root / 'rest_datasets' /  request.file_path
        self.guide_file_path = "/Users/swaminathanchellappa/Desktop/Swaminathan_Chellappa_Stuff/Research/annotation_tool/guide_datasets/"+request.file_path#self.project_root / 'guide_datasets' /  request.file_path
    
    def upsample(self):
        upsampling_payload = EmbedDatasetRequest(
            file_path = "/Users/swaminathanchellappa/Desktop/Swaminathan_Chellappa_Stuff/Research/annotation_tool/shared_uploads/"+self.request.file_path,
            text_col = self.request.text_col,
            id_col = self.request.id_col,
            split_to_sentences = self.request.split_to_sentences,
            labels = self.request.labels
        )
        print(self.rest_file_path)
        obj = RepresentativeSampling(upsampling_payload)
        upsampled_result = obj.run()
        upsampled_result.to_csv(self.rest_file_path)
    
    def coverage_sample(self):
        obj = CoverageBasedSampling(
            df = pd.read_csv(self.rest_file_path),
            model = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")
        )
        

        coverage_sampling_results = obj.sample(text_col="text_combined")
        coverage_sampling_results.to_csv(self.guide_file_path)
