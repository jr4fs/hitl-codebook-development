import torch
from sentence_transformers import SentenceTransformer
from .embed_dataset import DatasetEmbeddingService
from .faiss_indexing import FAISSIndexing
from .label_sampling import LabelSampling

class RepresentativeSampling:

   def run(self):

      # dataset embedding step (creating vectors of the text samples)
      dbembed_service_obj = DatasetEmbeddingService(
               d_all = self.df,
               text_cols=self.request.text_col,
               id_col=self.request.id_col,
               split_sent=self.request.split_to_sentences,
               model_name=self.request.model_name,
               device=self.request.device
            )
      database_df, sentence_model = dbembed_service_obj.build_embedding_database()

      print("Compelted embedding the dataset")
      
      # FAISS indexing step
      print("Beginning to build the FAISS index")
      faiss_service_obj = FAISSIndexing(
            df=database_df,
            vector_col="vector",
            use_cosine=True
            )
      index, vectors = faiss_service_obj.build_faiss_index() 

      print("Completed building the FAISS index")
      
      print("Beginning the Labelling Service")
      label_service_obj = LabelSampling(
            df= database_df,
            labels = self.request.labels,
            index= index,
            model = sentence_model,
            device = "mps" if torch.mps.is_available() else "cpu"
            )
      
      # representative sampple of all labels
      labeling_results_df = label_service_obj.run_faiss_indexing() 

      return labeling_results_df




      



      
