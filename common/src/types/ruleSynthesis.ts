export interface RuleSynthesisItem {
    sample_text: string;
    ai_labels: string[];
    ai_reasoning: string;
    ai_span_text: string;
    ground_truth_labels: string[];
    user_feedback: string;
}

export interface RuleSynthesisRequest {
    payload: RuleSynthesisItem[];
    task_type: string;
    model_name: string;
}

export interface RuleSynthesisResponse {
    success: boolean;
    rules: string[];
    model_name: string;
}