"""
API Routes Module

This module contains all FastAPI route definitions for the Voice-Based Document Navigator.
Routes are organized by functionality and use dependency injection for services.
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List

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
    embedding_service_obj = EmbeddingService(request)

    embedding_service_obj.run()
    
    return EmbedDatasetResponse(
        success= True
    )

