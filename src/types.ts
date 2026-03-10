export interface SymptomData {
  mainSymptom: string;
  intensity: 'weak' | 'normal' | 'severe';
  onset: 'today' | '1-2days' | '3days+';
  accompanyingSymptoms: string[];
}

export interface UserDetail {
  age: number;
  gender: 'male' | 'female';
  isPregnant: boolean;
  weight: number;
}

export interface HealthHistory {
  conditions: string[];
  allergies: string[];
  currentMeds: string[];
}

export interface DiagnosisResult {
  diseases: { name: string; probability: number; description: string }[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: {
    meds: { name: string; effect: string; usage: string; sideEffects: string }[];
    lifestyle: string[];
  };
  hospitalVisit: {
    necessity: 'low' | 'medium' | 'high';
    reason: string;
    department: string;
  };
  confidence: 'low' | 'medium' | 'high';
}

export interface DiagnosisHistoryItem {
  id: string;
  timestamp: string;
  symptoms: SymptomData;
  result: DiagnosisResult;
}
