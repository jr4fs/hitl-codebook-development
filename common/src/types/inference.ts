import { LabelItem } from "./tasks"

export interface InferenceRequest{
    labels:  LabelItem[]
    task_definition: string
    case_notes: string
    model_name: string
    user_input?: string
    task_type: string
}

export interface InferenceResponse{
    model_name: string 
    label: string
    span_text: string
    reason: string
    task_type: string
    tokens: number
    time: number
}