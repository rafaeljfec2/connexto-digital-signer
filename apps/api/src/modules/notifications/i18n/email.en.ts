export const emailMessages = {
  'signature-invite': {
    subject: 'You are invited to sign: {documentTitle}',
    greeting: 'Hello {signerName},',
    body: 'You have been invited to sign the document <strong>{documentTitle}</strong>.',
    bodyMessage: 'Message from sender:',
    cta: 'Sign document',
    footer: 'This link is unique and should not be shared.',
    textBody:
      'You have been invited to sign the document: {documentTitle}.\nAccess: {signUrl}',
  },
  'signature-reminder': {
    subject: 'Reminder: sign the document {documentTitle}',
    greeting: 'Hello {signerName},',
    body: 'You have not yet signed the document <strong>{documentTitle}</strong>. This is reminder {reminderCount} of {maxReminders}.',
    cta: 'Sign now',
    footer: 'This link is unique and should not be shared.',
    textBody:
      'Reminder {reminderCount}/{maxReminders}: sign the document {documentTitle}.\nAccess: {signUrl}',
  },
  'document-completed': {
    subject: 'Document completed: {documentTitle}',
    greeting: 'Hello {ownerName},',
    body: 'All signers have signed the document <strong>{documentTitle}</strong>.',
    cta: 'View document',
    footer: 'The signed document is available in your account.',
    textBody:
      'All signers have signed the document: {documentTitle}.\nAccess: {documentUrl}',
  },
  welcome: {
    subject: 'Welcome to Connexto Digital Signer',
    greeting: 'Hello {ownerName},',
    body: 'Your account has been created successfully. You can now send documents for digital signature.',
    cta: 'Go to dashboard',
    footer: 'Thank you for choosing Connexto Digital Signer.',
    textBody:
      'Welcome to Connexto Digital Signer! Your account has been created successfully.\nAccess: {dashboardUrl}',
  },
  'verification-code': {
    subject: 'Your verification code: {code}',
    greeting: 'Hello {signerName},',
    body: 'Use the code below to verify your identity before signing the document <strong>{documentTitle}</strong>.',
    expiry: 'This code expires in 10 minutes.',
    footer: 'If you did not request this code, please ignore this email.',
    textBody:
      'Your verification code is: {code}\nUse it to verify your identity before signing the document: {documentTitle}.\nThis code expires in 10 minutes.',
  },
} as const;
