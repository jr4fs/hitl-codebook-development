"""
API Routes Module

This module contains all FastAPI route definitions for the Annotation Tool.
Routes are organized by functionality and use dependency injection for services.
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List
from pathlib import Path

from models.embedding_schemas import EmbedDatasetRequest, EmbedDatasetResponse
from services.embedding_service import EmbeddingService
from models.ollama_adapter import InferenceRequest, InferenceResponse
from services.chat.chat_service import ChatService
from models.prompt_templating_model import PromptTemplate

embedding_router = APIRouter(prefix="/embedding", tags=["embedding"])
chat_router = APIRouter(prefix="/inference", tags=["inference"])


@embedding_router.post("/run", response_model=EmbedDatasetResponse)
async def run_embedding(request: EmbedDatasetRequest):
    """
    Perform the embedding for the input dataset

    Returns:
        success: True/False determines df_val and df_rest file creation status
    """
    try:
        print(
            f"Request payload: file_path={request.file_path}, text_col={request.text_col}, labels={len(request.labels)}"
        )

        embedding_service_obj = EmbeddingService(request)
        # df_val = embedding_service_obj.run()
        val_data = embedding_service_obj.run()
        # val_data = df_val.to_dict(orient='records')
        project_root = Path(__file__).parent.parent.parent
        val_file_path = project_root / "val_datasets" / request.file_path
        rest_file_path = project_root / "rest_datasets" / request.file_path
        return EmbedDatasetResponse(
            success=True,
            val_created=val_file_path.is_file(),
            rest_created=rest_file_path.is_file(),
            file_name=request.file_path,
            val_data=val_data,
        )
    except Exception as e:
        print(f"Error in run_embedding endpoint: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error processing embedding request: {str(e)}"
        )


@chat_router.post("/", response_model=InferenceResponse)
async def run_inference(request: InferenceRequest):
    """
    Perform the embedding for the input dataset

    Returns:
        model_name: Name of the model used to perfrom inference
        model_response: raw model response
        tokens: total number of tokens used (input + output) TODO: split into separate fields
        time: time taken (in seconds) to run inferencing
    """
    try:
        print(
            f"Request payload: model_name={request.model_name}, user_input={request.user_input}"
        )
        chat_service_obj = ChatService()
        prompt_template_obj = PromptTemplate()
        system_prompt = prompt_template_obj.get_task_system_prompt(request.task_type)
        response = chat_service_obj.send_chat(
            request.labels,
            request.task_definition,
            request.model_name,
            system_prompt,
            request.case_notes,
            request.user_input,
        )
        inference_response: InferenceResponse = {
            "model_name": request.model_name,
            "label": response["label"],
            "span_text": response["span_text"],
            "reason": response["reason"],
            "task_type": request.task_type,
            "tokens": 0,
            "time": 0.0,
        }
        return inference_response
    except Exception as e:
        print("[Inference] Error while running inference: ", e)
        raise HTTPException(status_code=500, detail=str(e))
