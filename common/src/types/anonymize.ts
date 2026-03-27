export interface PhraseMapping {
  text: string;
  replacement: string;
}

export interface AnonymizeConfig {
  _id?: string;
  anonymizeEnabled?: boolean;
  // Toggle rules
  ageEnabled: boolean;
  emailEnabled: boolean;
  phoneEnabled: boolean;
  pronounEnabled: boolean;
  // Phrase mappings (phrase_protect rule)
  phrases: PhraseMapping[];
  // Skip words (presidio_filtered rule)
  skipWords: string[];
  // Names file metadata
  namesFileName?: string;
  // Metadata
  updatedAt: string;
}

export interface AnonymizeConfigResponse {
  success: boolean;
  config?: AnonymizeConfig;
  message?: string;
}

export interface UpdateAnonymizeConfigRequest {
  anonymizeEnabled?: boolean;
  ageEnabled?: boolean;
  emailEnabled?: boolean;
  phoneEnabled?: boolean;
  pronounEnabled?: boolean;
  phrases?: PhraseMapping[];
  skipWords?: string[];
}
