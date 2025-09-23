/**
 * Rule-based contract analysis using pattern matching
 * This is the fallback analyzer when AI is unavailable
 */

interface Flag {
  clause: string;
  severity: 'low' | 'medium' | 'high';
  rationale: string;
  suggestion: string;
}

interface RuleAnalysisResult {
  overall_risk: 'low' | 'medium' | 'high';
  summary: string;
  flags: Flag[];
}

const patterns = [
  "indemn", "limitation of liability", "liability cap", "arbitration", "jurisdiction",
  "auto-renew", "renewal", "assignment", "confidential", "termination for convenience",
  "late fee", "interest", "intellectual property", "ip ownership", "non-solicit",
  "noncompete", "non-compete", "warranty", "as is", "force majeure", "governing law"
];

const severityMap: { [key: string]: 'low' | 'medium' | 'high' } = {
  "indemn": "high",
  "limitation of liability": "high", 
  "liability cap": "high",
  "ip ownership": "high",
  "noncompete": "high",
  "non-compete": "high",
  "arbitration": "medium",
  "jurisdiction": "medium",
  "assignment": "medium",
  "termination for convenience": "medium",
  "confidential": "medium",
  "warranty": "medium",
  "auto-renew": "low",
  "renewal": "low",
  "late fee": "low",
  "interest": "low",
  "force majeure": "low",
  "governing law": "low",
  "non-solicit": "medium",
  "intellectual property": "medium",
  "as is": "medium"
};

const rationaleMap: { [key: string]: string } = {
  "indemn": "Indemnification clauses can expose you to unlimited liability for third-party claims.",
  "limitation of liability": "Liability limitations may prevent you from recovering damages for breaches.",
  "liability cap": "Liability caps can restrict compensation for significant losses or damages.",
  "ip ownership": "IP ownership terms may transfer your work rights to the client permanently.",
  "noncompete": "Non-compete clauses can restrict your ability to work with other clients.",
  "non-compete": "Non-compete clauses can restrict your ability to work with other clients.",
  "arbitration": "Mandatory arbitration limits your right to pursue claims in court.",
  "jurisdiction": "Jurisdiction clauses may require disputes to be resolved in inconvenient locations.",
  "assignment": "Assignment rights allow the client to transfer the contract without your consent.",
  "termination for convenience": "Termination for convenience allows abrupt contract cancellation without cause.",
  "confidential": "Confidentiality terms may be overly broad and restrict your future work.",
  "warranty": "Warranty clauses may create ongoing obligations and liability exposure.",
  "auto-renew": "Auto-renewal clauses can extend commitments beyond your intended timeframe.",
  "renewal": "Renewal terms may lock you into unfavorable conditions for extended periods.",
  "late fee": "Late fee provisions can result in additional charges for delayed payments.",
  "interest": "Interest charges on overdue payments can accumulate significant costs.",
  "force majeure": "Force majeure clauses define what events excuse performance delays.",
  "governing law": "Governing law determines which jurisdiction's laws apply to disputes.",
  "non-solicit": "Non-solicitation clauses may restrict your ability to work with the client's contacts.",
  "intellectual property": "IP clauses define ownership and usage rights for created work.",
  "as is": "As-is provisions limit warranties and may reduce your legal protections."
};

const suggestionMap: { [key: string]: string } = {
  "indemn": "Negotiate mutual indemnification or cap your indemnity obligations to project value.",
  "limitation of liability": "Request mutual liability limitations or minimum liability floors.",
  "liability cap": "Ensure caps don't apply to your own negligence or IP infringement claims.",
  "ip ownership": "Retain rights to pre-existing work and general methodologies developed.",
  "noncompete": "Limit scope to direct competitors and specific time/geographic boundaries.",
  "non-compete": "Limit scope to direct competitors and specific time/geographic boundaries.",
  "arbitration": "Negotiate for mediation first, or mutual agreement to arbitrate.",
  "jurisdiction": "Choose a neutral jurisdiction or your home jurisdiction for disputes.",
  "assignment": "Require written consent for assignments or limit to corporate transactions.",
  "termination for convenience": "Negotiate notice periods and payment for work completed plus costs.",
  "confidential": "Define confidentiality scope clearly and include reasonable exceptions.",
  "warranty": "Limit warranties to professional standards and exclude consequential damages.",
  "auto-renew": "Include opt-out notice periods and right to modify terms upon renewal.",
  "renewal": "Ensure renewal terms are subject to renegotiation and rate adjustments.",
  "late fee": "Cap late fees at reasonable amounts and provide grace periods for payment.",
  "interest": "Negotiate reasonable interest rates and payment plan options.",
  "force majeure": "Ensure events include circumstances beyond your reasonable control.",
  "governing law": "Choose laws from a jurisdiction familiar to both parties.",
  "non-solicit": "Limit to employees you directly worked with and reasonable time periods.",
  "intellectual property": "Clarify work-for-hire vs. licensed work and retain portfolio rights.",
  "as is": "Request specific warranties for critical deliverables and fitness for purpose."
};

function findClauseContext(text: string, pattern: string, startIndex: number): string {
  const sentences = text.split(/[.!?]+/);
  let charCount = 0;
  
  for (const sentence of sentences) {
    const sentenceStart = charCount;
    const sentenceEnd = charCount + sentence.length;
    
    if (startIndex >= sentenceStart && startIndex <= sentenceEnd) {
      return sentence.trim() || text.substring(Math.max(0, startIndex - 120), startIndex + 120);
    }
    
    charCount = sentenceEnd + 1;
  }
  
  return text.substring(Math.max(0, startIndex - 120), startIndex + 120);
}

/**
 * Run rule-based contract analysis using pattern matching
 */
export async function runRuleAnalyzer(source_text: string): Promise<RuleAnalysisResult> {
  console.log('Running rule-based analysis...');
  
  const flags: Flag[] = [];
  const lowerText = source_text.toLowerCase();
  const foundPatterns = new Set<string>();

  // Search for patterns
  for (const pattern of patterns) {
    const index = lowerText.indexOf(pattern.toLowerCase());
    if (index !== -1 && !foundPatterns.has(pattern)) {
      foundPatterns.add(pattern);
      
      const clause = findClauseContext(source_text, pattern, index);
      const severity = severityMap[pattern] || 'low';
      const rationale = rationaleMap[pattern] || 'This clause may require careful review.';
      const suggestion = suggestionMap[pattern] || 'Consider negotiating more favorable terms.';
      
      flags.push({
        clause: clause.length > 240 ? clause.substring(0, 237) + '...' : clause,
        severity,
        rationale,
        suggestion
      });
    }
  }

  // Compute overall risk
  const hasHigh = flags.some(flag => flag.severity === 'high');
  const hasMedium = flags.some(flag => flag.severity === 'medium');
  
  let overall_risk: 'low' | 'medium' | 'high';
  if (hasHigh) {
    overall_risk = 'high';
  } else if (hasMedium) {
    overall_risk = 'medium';
  } else {
    overall_risk = 'low';
  }

  // Generate summary
  let summary: string;
  if (flags.length === 0) {
    summary = "No significant risk patterns detected. This appears to be a relatively standard agreement.";
  } else if (overall_risk === 'high') {
    summary = `Found ${flags.length} potential issues including high-risk clauses that could significantly impact your rights and obligations.`;
  } else if (overall_risk === 'medium') {
    summary = `Identified ${flags.length} areas for review with moderate risk factors that warrant careful consideration.`;
  } else {
    summary = `Detected ${flags.length} minor clauses that are generally standard but worth understanding.`;
  }

  console.log(`Rule-based analysis complete: ${overall_risk} risk, ${flags.length} flags`);
  
  return {
    overall_risk,
    summary,
    flags
  };
}