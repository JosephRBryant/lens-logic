export interface AnalysisResult {
  claim: string;
  classification: string;
  assumptions: string[];
  variables: string[];
  perspectives: string[];
  conclusion: string;
  hingesOn: string;
  breaksIf: string;
  holdsWhen: string;
  stronger: string;
  weaker: string;
  coreQuestion: string;
  counterargument: string;
  article: string;
}

export interface ClaimStructure {
  subject: string;
  relation: string;
  object: string;
  concepts: string[];
}

export interface ClaimTraits {
  isCausal: boolean;
  isPredictive: boolean;
  isNormative: boolean;
  isComparative: boolean;
  isAbsolute: boolean;
  hasTradeoff: boolean;
  isShort: boolean;
  hasNumbers: boolean;
  isQuestion: boolean;
  domainWork: boolean;
  domainTech: boolean;
  domainEducation: boolean;
  domainEcon: boolean;
  domainPolicy: boolean;
  domainHealth: boolean;
  domainProductivity: boolean;
}
