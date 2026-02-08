"""
API Routes Module

This module contains all FastAPI route definitions for the Annotation Tool.
Routes are organized by functionality and use dependency injection for services.
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends, Request
from fastapi.responses import JSONResponse, Response
from typing import List, Optional
from pathlib import Path
import json

from models.embedding_schemas import (EmbedDatasetRequest, EmbedDatasetResponse)
from services.embedding_service import EmbeddingService
from services.anonymizer.service import anonymize_csv_bytes, get_config_defaults

embedding_router = APIRouter(prefix="/embedding", tags=["embedding"])
anonymize_router = APIRouter(prefix="/anonymize", tags=["anonymize"])

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


@anonymize_router.post("/csv")
async def anonymize_csv(
    file: UploadFile = File(...),
    config: Optional[str] = Form(None)
):
    """
    Anonymize a CSV file with optional config overrides.
    
    Args:
        file: CSV file to anonymize
        config: Optional JSON string with config overrides from DB
    """
    try:
        csv_bytes = await file.read()
        if not csv_bytes:
            raise HTTPException(status_code=400, detail="CSV payload is empty")

        # Parse config overrides if provided
        config_overrides = None
        if config:
            try:
                config_overrides = json.loads(config)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid config JSON")

        anonymized = anonymize_csv_bytes(
            csv_bytes,
            text_columns=["Notes"],
            config_overrides=config_overrides
        )
        return Response(content=anonymized, media_type="text/csv")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error anonymizing CSV: {str(e)}")


@anonymize_router.get("/defaults")
async def get_anonymize_defaults():
    """
    Return the default anonymization config values parsed from config.yaml.
    Used by Node.js backend to get defaults instead of hardcoding.
    """
    try:
        defaults = get_config_defaults()
        return JSONResponse(content={"success": True, "defaults": defaults})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading defaults: {str(e)}")

