from typing import Dict, Any, List, Optional
import pandas as pd
from models.embedding_schemas import EmbedDatasetRequest
from services.dbembed_service import DatasetEmbeddingService
from services.faiss_service import FAISSService
from services.label_service import LabelService

class EmbeddingService:
    def __init__(self, request: EmbedDatasetRequest) -> None:
        self.request: EmbedDatasetRequest = request
        self.df = pd.read_csv(request.file_path).head(1000)
        self.df["example_id"] = range(1, len(self.df) + 1)
        
    def run(self):
        dbembed_service_obj = DatasetEmbeddingService(
            df = self.df,
            text_col=self.request.text_col,
            id_col=self.request.id_col,
            split_sent=self.request.split_to_sentences,  # sentences → better retrieval
            model_name=self.request.model_name,
            device=self.request.device
            )
        database_df, sbert_model = dbembed_service_obj.build_embedding_database()

        print("Compelted embedding the dataset")
        print("Beginning to build the FAISS index")
        faiss_service_obj = FAISSService(
            df=database_df,
            vector_col="vector",
            use_cosine=True
            )
        index, _ = faiss_service_obj.build_faiss_index()
        print("Completed building the FAISS index")
        print("Beginning the Labelling Service")
        label_service_obj = LabelService(
            df=database_df,
            model= sbert_model,
            labels = self.request.labels,
            n_per_class= 40,
            index= index
            )
        
        labeling_results = label_service_obj.run_faiss_indexing()
        selected_example_ids = labeling_results["orig_id"].unique().tolist()
        print("Completed the Labelling Service")

        df_val = self.df.merge(
            labeling_results[["orig_id", "label_name", "keyword_used", "label_keywords_used", "sentence_idx", "text"]],
            left_on="example_id",
            right_on="orig_id",
            how="inner"
        )

        df_rest = self.df[~self.df["example_id"].isin(selected_example_ids)].copy()

        print("df_val: ", len(df_val))
        print("df_rest: ", len(df_rest))
        df_val.to_csv('df_val.csv')
        df_rest.to_csv('df_rest.csv')
        
        




