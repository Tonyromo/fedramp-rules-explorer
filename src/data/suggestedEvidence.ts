export interface SuggestedEvidenceItem {
  evidence: string
  basis: string
}

const GENERIC_EVIDENCE = [
  'Approved requirement and supporting procedure',
  'Authoritative configuration or system export',
  'Representative operating records',
  'Monitoring or review results',
  'Test or validation evidence',
  'Exception and corrective-action records',
]

const POLICY_EVIDENCE = [
  'Approved policy and supporting procedure',
  'Named policy or control owner',
  'Distribution or communication record',
  'Annual or event-driven review history',
  'Approval history',
  'Representative operating evidence showing the policy is implemented',
]

const FAMILY_EVIDENCE: Record<string, string[]> = {
  ac: [
    'IAM, SSO, or PAM configuration export',
    'Account and role inventory',
    'Access approval and deprovisioning records',
    'Periodic access-review results',
    'Representative authentication or access tests',
    'Relevant access and authentication logs',
  ],
  at: [
    'Approved security awareness and training content',
    'Role-based training curriculum',
    'LMS assignments and completion export',
    'Phishing or social-engineering exercise results',
    'Overdue-training escalation records',
    'Training content review and approval records',
  ],
  au: [
    'Logging and audit standard',
    'SIEM and log-source inventory',
    'Logging configuration or export',
    'Representative immutable audit records',
    'Retention configuration',
    'Correlation and alert rules',
    'Evidence of log review and related incident tickets',
  ],
  ca: [
    'SSP or control implementation narrative',
    'Assessment plan and assessment procedures',
    'Assessor workpapers, SAR, or SRTM evidence',
    'POA&M records',
    'Continuous-monitoring plan and dashboards',
    'Remediation and closure records',
  ],
  cm: [
    'Approved secure configuration baselines',
    'Infrastructure-as-code or policy-as-code',
    'CMDB or authoritative asset inventory export',
    'Change requests and approvals',
    'Configuration drift or compliance scan results',
    'Exception records and remediation tickets',
  ],
  cp: [
    'Business impact analysis and contingency plan',
    'RTO and RPO mapping',
    'Backup configuration and job history',
    'Restoration test results',
    'Exercise plan and attendance records',
    'After-action report and corrective actions',
  ],
  ia: [
    'Identity provider, MFA, SSO, or PAM configuration export',
    'Account, role, and service-identity inventory',
    'Provisioning and deprovisioning records',
    'Periodic identity and access review results',
    'Credential rotation or revocation evidence',
    'Representative authentication test results and logs',
  ],
  ir: [
    'Incident response plan and playbooks',
    'On-call or incident-response roster',
    'Incident and ticket records',
    'Evidence-preservation procedure',
    'Tabletop or exercise results',
    'Notification test results and lessons learned',
  ],
  ma: [
    'Maintenance policy and procedures',
    'Approved maintenance tool and personnel list',
    'Maintenance tickets and logs',
    'Remote-maintenance session records',
    'Media sanitization evidence',
    'Post-maintenance validation results',
  ],
  mp: [
    'Media inventory and handling rules',
    'Media access and transport records',
    'Encryption configuration for protected media',
    'Sanitization certificates',
    'Chain-of-custody records',
    'Disposal records or vendor attestations',
  ],
  pe: [
    'Inherited-control package and responsibility matrix where applicable',
    'Facility or office access lists',
    'Visitor and badge logs',
    'Physical security monitoring records',
    'Environmental monitoring records',
    'Periodic physical-control review evidence',
  ],
  pl: [
    'Approved security and privacy plans',
    'FIPS 199 security categorization',
    'Data inventory and data-flow documentation',
    'Privacy impact or SORN determination where applicable',
    'Privacy notices, consent, or rules-of-behavior records where applicable',
    'Plan review and approval records',
  ],
  ps: [
    'Position-risk designations',
    'Personnel screening or adjudication evidence',
    'Access agreements',
    'Onboarding, transfer, and termination records',
    'NDA or acceptable-use acknowledgements',
    'Personnel sanctions records where applicable',
  ],
  ra: [
    'Current risk assessment and threat model',
    'Vulnerability scan exports',
    'Penetration-test report where applicable',
    'Risk register',
    'KEV or EPSS-based prioritization evidence where used',
    'Remediation, exception, and risk-acceptance records',
  ],
  sa: [
    'Secure SDLC and acquisition requirements',
    'Contracts and security clauses',
    'Architecture or design review records',
    'Source, dependency, or container scan results',
    'Software bill of materials where applicable',
    'Code review and release approvals',
  ],
  sc: [
    'Network and data-flow diagrams',
    'Firewall, WAF, or security-group configuration',
    'TLS and FIPS cryptographic module evidence',
    'KMS or cryptographic key inventory and rotation records',
    'Segmentation and failover test results',
    'Representative packet captures or configuration samples',
  ],
  si: [
    'Patch and vulnerability management SLA or standard',
    'EDR or anti-malware configuration',
    'Vulnerability scan and patch reports',
    'Integrity-monitoring alerts',
    'Threat-intelligence inputs',
    'Incident and remediation tickets',
    'Approved exceptions',
  ],
  sr: [
    'Supply-chain risk management plan',
    'Supplier inventory and tiering',
    'Supplier due-diligence assessments',
    'Contractual security requirements',
    'SBOM or provenance evidence where applicable',
    'Supplier monitoring and incident notifications',
    'Supplier exit and contingency plans',
  ],
}

const CONTROL_OVERRIDES: Record<string, string[]> = {
  'ac-1': POLICY_EVIDENCE,
  'ac-2': [
    'IAM, SSO, or PAM configuration export',
    'Current account and role inventory',
    'Account approval, provisioning, suspension, and deprovisioning records',
    'Periodic access-review results',
    'Representative authentication and access tests',
    'Relevant account-management and authentication logs',
  ],
  'ac-2.4': [
    'Logging standard covering automated account-management actions',
    'SIEM or audit-source configuration',
    'Sample immutable account-management audit records',
    'Audit retention settings',
    'Alert or correlation rules for relevant account events',
    'Review or incident tickets generated from account-management events',
  ],
  'ac-17.1': [
    'Remote-access monitoring configuration',
    'EDR or endpoint-protection configuration for remote endpoints',
    'Remote-access and security monitoring logs',
    'Relevant vulnerability and patch reports',
    'Alerts and incident or remediation tickets',
    'Approved remote-access exceptions',
  ],
  'ac-17.2': [
    'Remote-access encryption configuration',
    'TLS or VPN configuration and approved cipher settings',
    'FIPS cryptographic module evidence where required',
    'Representative connection or configuration samples',
    'Key or certificate inventory and rotation records',
    'Remote-access validation or test evidence',
  ],
  'ac-17.3': [
    'Architecture or network diagram showing managed remote-access control points',
    'VPN, ZTNA, bastion, or gateway configuration export',
    'Firewall or security-group rules restricting remote access paths',
    'Remote-access inventory and approved entry points',
    'Representative remote-access logs',
    'Test evidence showing remote access is routed through managed control points',
  ],
  'at-1': POLICY_EVIDENCE,
  'au-1': POLICY_EVIDENCE,
  'au-2': FAMILY_EVIDENCE.au,
  'ca-1': POLICY_EVIDENCE,
  'ca-2': FAMILY_EVIDENCE.ca,
  'cm-1': POLICY_EVIDENCE,
  'cm-2': FAMILY_EVIDENCE.cm,
  'cp-1': POLICY_EVIDENCE,
  'cp-2': FAMILY_EVIDENCE.cp,
  'ia-1': POLICY_EVIDENCE,
  'ia-2.12': [
    'Identity proofing and authenticator standard',
    'IdP, MFA, or PIV configuration',
    'PIV trust and certificate configuration',
    'Service identity and certificate inventory',
    'Credential rotation and revocation evidence',
    'Representative PIV authentication test results',
  ],
  'ir-1': POLICY_EVIDENCE,
  'ir-3': FAMILY_EVIDENCE.ir,
  'ma-1': POLICY_EVIDENCE,
  'mp-1': POLICY_EVIDENCE,
  'pe-1': POLICY_EVIDENCE,
  'pl-1': POLICY_EVIDENCE,
  'ps-1': POLICY_EVIDENCE,
  'ra-1': POLICY_EVIDENCE,
  'ra-3': [
    'Current risk assessment',
    'Threat model and identified threat sources',
    'Documented likelihood and impact methodology',
    'Risk register with treatment decisions',
    'Evidence of management review or approval',
    'Remediation, exception, and acceptance records',
  ],
  'ra-5': FAMILY_EVIDENCE.ra,
  'sa-1': POLICY_EVIDENCE,
  'sa-11.2': [
    'Current threat model',
    'Secure design or architecture review records',
    'Vulnerability analysis results',
    'Source, dependency, and container scan reports',
    'Penetration or security test results where applicable',
    'Tracked remediation or risk-acceptance records',
  ],
  'sc-1': POLICY_EVIDENCE,
  'sc-7': FAMILY_EVIDENCE.sc,
  'si-1': POLICY_EVIDENCE,
  'si-3': FAMILY_EVIDENCE.si,
  'sr-1': POLICY_EVIDENCE,
  'sr-2': [
    'Current supply-chain risk management plan',
    'Supplier inventory and criticality or tiering',
    'Supply-chain risk assessment',
    'Supplier due-diligence records',
    'Contractual security and notification requirements',
    'Supplier monitoring, incident, and contingency records',
  ],
}

function normalizeControlId(controlId: string): string {
  return controlId
    .trim()
    .toLowerCase()
    .replace(/\((\d+)\)/g, '.$1')
    .replace(/\s+/g, '')
}

export function getSuggestedEvidence(controlId: string): SuggestedEvidenceItem[] {
  const id = normalizeControlId(controlId)
  const family = id.split('-')[0]
  const suggestions = CONTROL_OVERRIDES[id]
    ?? (/-1$/.test(id) ? POLICY_EVIDENCE : FAMILY_EVIDENCE[family])
    ?? GENERIC_EVIDENCE
  const basis = CONTROL_OVERRIDES[id]
    ? `Control-specific guidance for ${controlId.toUpperCase()}`
    : FAMILY_EVIDENCE[family]
      ? `${family.toUpperCase()} control-family evidence pattern`
      : 'General assessor evidence pattern'

  return suggestions.map((evidence) => ({ evidence, basis }))
}
