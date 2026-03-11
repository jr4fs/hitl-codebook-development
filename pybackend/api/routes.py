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
import asyncio

from models.embedding_schemas import EmbedDatasetRequest, EmbedDatasetResponse
from models.rule_synthesis_schema import RuleSynthesisRequest, RuleSynthesisResponse
#from services.embedding_service import EmbeddingService
from services.anonymizer.service import anonymize_csv_bytes, get_config_defaults
from models.ollama_adapter import InferenceRequest, InferenceResponse, BatchInferenceRequest, BatchInferenceResponse, BatchInferenceSummary
from services.chat.chat_service import ChatService
from models.prompt_templating_model import PromptTemplate
from services.chat.rule_synthesis_service import RuleSynthesisService

embedding_router = APIRouter(prefix="/embedding", tags=["embedding"])
chat_router = APIRouter(prefix="/inference", tags=["inference"])
anonymize_router = APIRouter(prefix="/anonymize", tags=["anonymize"])

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


@chat_router.post("/", response_model=InferenceResponse)
async def run_inference(request: InferenceRequest):
    """
    Perform annotation inference for the incoming sample

    Returns:
        model_name: Name of the model used to perfrom inference
        model_response: raw model response
        tokens: total number of tokens used (input + output) TODO: split into separate fields
        time: time taken (in seconds) to run inferencing
    """
    try:
        print(
            f"[AI Annotation] Request payload: model_name={request.model_name}, user_input={request.user_input}"
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
            "raw_response": response.get("raw_response", ""),
            "task_type": request.task_type,
            "tokens": response.get("tokens", 0),
            "time": response.get("time", 0.0),
        }
        return inference_response
    except Exception as e:
        print("[Inference] Error while running inference: ", e)
        raise HTTPException(status_code=500, detail=str(e))

@chat_router.post("/batch-inference", response_model=BatchInferenceSummary)
async def run_batch_inference(request: List[BatchInferenceRequest]):
    """
    Perform annotation inference for the incoming samples in parallel
    """
    try:
        chat_service_obj = ChatService()
        prompt_template_obj = PromptTemplate()
        
        # We assume all samples in a batch share the same task_type for the system prompt
        system_prompt = prompt_template_obj.get_task_system_prompt(request[0].task_type) if request else ""

        tasks = [
            process_single_sample(
                sample, 
                chat_service_obj, 
                system_prompt
            )
            for sample in request
        ]

        inference_results = await asyncio.gather(*tasks)
        
        # Calculate overall accuracy
        correct_count = sum(1 for res in inference_results if res.is_correct)
        accuracy = correct_count / len(inference_results) if inference_results else 0.0

        return BatchInferenceSummary(
            results=inference_results,
            accuracy=accuracy
        )

    except Exception as e:
        print("[Batch Inference] Error while running batch inference: ", e)
        raise HTTPException(status_code=500, detail=str(e))

async def process_single_sample(
    sample: BatchInferenceRequest, 
    chat_service_obj: ChatService, 
    system_prompt: str
) -> BatchInferenceResponse:
    """Process a single sample using a thread pool for the synchronous send_chat call"""
    response = await asyncio.to_thread(
        chat_service_obj.send_chat,
        sample.ground_truth_labels,
        sample.task_definition,
        sample.model_name,
        system_prompt,
        sample.case_notes,
        sample.user_input,
    )
    
    gt_label_names = [l.name for l in sample.ground_truth_labels]
    model_labels = response["label"]
    
    # Handle both single string and list of strings for model_labels
    if isinstance(model_labels, str):
        model_labels = [model_labels]
    
    return BatchInferenceResponse(
        model_name=sample.model_name,
        is_correct = set(gt_label_names) == set(model_labels),
        tokens=response.get("tokens", 0),
        time=response.get("time", 0.0),
    )

@chat_router.post("/rule-synthesis", response_model=RuleSynthesisResponse)
async def run_rule_synthesis(request: RuleSynthesisRequest):
    try:
        print(
            f"[Rule Synthesis] Request payload: model_name={request.model_name}"
        )
        rule_synthesis_service_obj = RuleSynthesisService()
        prompt_template_obj = PromptTemplate()
        system_prompt = prompt_template_obj.get_task_system_prompt(request.task_type)
        response = rule_synthesis_service_obj.send_chat(
            request.model_name,
            system_prompt,
            request.payload
        )
        rule_synthesis_response: RuleSynthesisResponse = {
            "success": response["success"],
            "model_name": request.model_name,
            "rules": response["rules"]
        }
        return rule_synthesis_response

    except Exception as e:
        print("[Rule synthesis] Error while running rule synthesis : ", e)
        raise HTTPException(status_code=500, detail=str(e))
from services.managedata.data_manager_service import DataManagerService

@embedding_router.post("/representative")
async def representative_sampling(request: EmbedDatasetRequest):
    """
    Perform representative sampling (keyword-based)
    """
    try:
        service = DataManagerService(request)
        service.upsample()
        return {"success": True, "message": "Representative sampling completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@embedding_router.post("/coverage")
async def coverage_sampling(request: EmbedDatasetRequest):
    """
    Perform coverage-based sampling (diversity-maximized)
    """
    try:
        service = DataManagerService(request)
        service.coverage_sample()
        return {"success": True, "message": "Coverage sampling completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
