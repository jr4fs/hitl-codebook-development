export interface Label{
    name: string;
    definition: string;
    keywords: string[]
}

export interface EmbedDatasetRequest{
    file_path: string;
    text_col: string;
    id_col?: string;
    split_to_sentences?: boolean;
    model_name?: string;
    device?: string;
    labels: Label[]
}

interface CsvRow {
    [key: string]: string;
  }

export interface EmbedDatasetResponse{
    success: boolean;
    val_created: boolean;
    rest_created: boolean;
    file_name: string;
    val_data?: CsvRow[]; 
}
