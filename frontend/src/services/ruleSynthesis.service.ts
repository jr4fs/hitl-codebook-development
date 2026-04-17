import { apiClient } from "../lib/apiClient";
import { RuleSynthesisRequest, RuleSynthesisResponse } from "@common/types/ruleSynthesis";
import { AxiosError } from "axios";

export async function ruleSynthesis(
    payload: RuleSynthesisRequest
): Promise<RuleSynthesisResponse> {
    try {
        const { data } = await apiClient.post<RuleSynthesisResponse>(
            "/api/inference/rule-synthesis",
            payload
        );
        return data;
    } catch (error) {
        if (error instanceof AxiosError) {
            console.error("API Error:", error.response?.data || error.message);
            throw error;
        }
        throw error;
    }
}
