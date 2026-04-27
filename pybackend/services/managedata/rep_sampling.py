import pandas as pd
import torch
from sentence_transformers import SentenceTransformer
from .embed_dataset import DatasetEmbedding
from .faiss_indexing import FAISSIndexing
from .label_sampling import LabelSampling
from models.embedding_schemas import EmbedDatasetRequest


class RepresentativeSampling:

    def __init__(self, request: EmbedDatasetRequest) -> None:
        self.request: EmbedDatasetRequest = request
        self.df = pd.read_csv(request.file_path)

    def run(self):
        # dataset embedding step (creating vectors of the text samples)
        print(self.request.file_path)
        print(self.df.columns)
        dbembed_service_obj = DatasetEmbedding(
            d_all=self.df,
            text_cols=self.request.text_col,
            id_col=self.request.id_col,
            do_split_sentences=self.request.split_to_sentences,
            use_cosine = True
        )
        database_df, sentence_model = dbembed_service_obj.build_embedding_database()

        print("Compelted embedding the dataset")

        # FAISS indexing step
        print("Beginning to build the FAISS index")
        faiss_service_obj = FAISSIndexing(
            df=database_df, vector_col="vector", use_cosine=True
        )
        try:
            index, vectors = faiss_service_obj.build_faiss_index()
        except Exception as e:
            print(f"FAISS build failed: {type(e).__name__}: {e}")
            raise

        print("Completed building the FAISS index")

        print("Beginning the Labelling Service")
        label_service_obj = LabelSampling(
            df=database_df,
            labels=self.request.labels,
            index=index,
            model=sentence_model,
            device="cuda" if torch.cuda.is_available() else "cpu",
        )

        # representative sampple of all labels
        labeling_results_df = label_service_obj.run_faiss_indexing()

        return labeling_results_df
