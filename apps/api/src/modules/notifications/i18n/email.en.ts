export const emailMessages = {
  shared: {
    brandTagline: 'ELECTRONIC SIGNATURE',
    footerBrand: 'Nexosign · Electronic signatures with traceability',
    securityNotice: 'Your link is personal and secure. Do not share this email.',
    badgeIdentity: 'Verified identity',
    badgeIntegrity: 'Document integrity',
    badgeIntegrityAlgo: 'SHA-256',
    badgeAudit: 'Audit trail',
  },
  'signature-invite': {
    subject: 'You received a document to sign: {documentTitle}',
    headline: 'You received a document to sign',
    greeting: 'Hello, <strong>{signerName}</strong>.',
    body: '<strong>{organizationName}</strong> invited you to sign the document:',
    bodyMessage: 'Message from sender:',
    documentStatus: 'Document awaiting your signature',
    cta: 'Review and sign document →',
    textBody:
      'Hello, {signerName}.\n{organizationName} invited you to sign the document: {documentTitle}.\nAccess: {signUrl}',
  },
  'signature-reminder': {
    subject: 'Reminder: sign the document {documentTitle}',
    headline: 'Signature reminder',
    greeting: 'Hello, <strong>{signerName}</strong>.',
    body: 'You have not yet signed the document. This is reminder <strong>{reminderCount}</strong> of <strong>{maxReminders}</strong>:',
    documentStatus: 'Document awaiting your signature',
    cta: 'Review and sign document →',
    textBody:
      'Reminder {reminderCount}/{maxReminders}: sign the document {documentTitle}.\nAccess: {signUrl}',
  },
  'document-completed': {
    subject: 'Document completed: {documentTitle}',
    headline: 'Document signed successfully',
    greeting: 'Hello, <strong>{ownerName}</strong>.',
    body: 'All signers have signed the document:',
    documentStatus: 'Document completed',
    cta: 'View document summary →',
    textBody:
      'All signers have signed the document: {documentTitle}.\nAccess: {documentUrl}',
  },
  welcome: {
    subject: 'Welcome to Nexosign',
    headline: 'Your account is ready',
    greeting: 'Hello, <strong>{ownerName}</strong>.',
    body: 'Your account has been created successfully. You can now send documents for electronic signature.',
    cta: 'Go to dashboard →',
    textBody:
      'Welcome to Nexosign! Your account has been created successfully.\nAccess: {dashboardUrl}',
  },
  'verification-code': {
    subject: 'Your verification code: {code}',
    headline: 'Verification code',
    greeting: 'Hello, <strong>{signerName}</strong>.',
    body: 'Use the code below to verify your identity before signing the document <strong>{documentTitle}</strong>.',
    expiry: 'This code expires in 10 minutes.',
    footer: 'If you did not request this code, please ignore this email.',
    textBody:
      'Your verification code is: {code}\nUse it to verify your identity before signing the document: {documentTitle}.\nThis code expires in 10 minutes.',
  },
} as const;
