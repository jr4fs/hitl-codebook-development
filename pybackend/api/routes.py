"""
API Routes Module

This module contains all FastAPI route definitions for the Annotation Tool.
Routes are organized by functionality and use dependency injection for services.
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List
from pathlib import Path

from models.embedding_schemas import (EmbedDatasetRequest, EmbedDatasetResponse)
from services.embedding_service import EmbeddingService

embedding_router = APIRouter(prefix="/embedding", tags=["embedding"])

@embedding_router.post("/run", response_model=EmbedDatasetResponse)
async def run_embedding(request: EmbedDatasetRequest):
    """
    Perform the embedding for the input dataset
    
    Returns:
        success: True/False determines df_val and df_rest file creation status
    """
    try:
        print("Came into the endpoint")
        print(f"Request payload: file_path={request.file_path}, text_col={request.text_col}, labels={len(request.labels)}")
        
        embedding_service_obj = EmbeddingService(request)
        df_val = embedding_service_obj.run()
        val_data = df_val.to_dict(orient='records')
        project_root = Path(__file__).parent.parent.parent
        val_file_path = project_root / 'val_datasets' /  request.file_path
        rest_file_path = project_root / 'rest_datasets' /  request.file_path
        return EmbedDatasetResponse(
            success=True,
            val_created= val_file_path.is_file(),
            rest_created= rest_file_path.is_file(),
            file_name=request.file_path,
            val_data=val_data,
            )
    except Exception as e:
        print(f"Error in run_embedding endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing embedding request: {str(e)}"
        )

