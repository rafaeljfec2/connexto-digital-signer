export const emailMessages = {
  'signature-invite': {
    subject: 'Voce foi convidado a assinar: {documentTitle}',
    greeting: 'Ola {signerName},',
    body: 'Voce foi convidado a assinar o documento <strong>{documentTitle}</strong>.',
    bodyMessage: 'Mensagem do remetente:',
    cta: 'Assinar documento',
    footer: 'Este link e unico e nao deve ser compartilhado.',
    textBody: 'Voce foi convidado a assinar o documento: {documentTitle}.\nAcesse: {signUrl}',
  },
  'signature-reminder': {
    subject: 'Lembrete: assine o documento {documentTitle}',
    greeting: 'Ola {signerName},',
    body: 'Voce ainda nao assinou o documento <strong>{documentTitle}</strong>. Este e o lembrete {reminderCount} de {maxReminders}.',
    cta: 'Assinar agora',
    footer: 'Este link e unico e nao deve ser compartilhado.',
    textBody:
      'Lembrete {reminderCount}/{maxReminders}: assine o documento {documentTitle}.\nAcesse: {signUrl}',
  },
  'document-completed': {
    subject: 'Documento concluido: {documentTitle}',
    greeting: 'Ola {ownerName},',
    body: 'Todos os signatários assinaram o documento <strong>{documentTitle}</strong>.',
    cta: 'Ver resumo do documento',
    footer: 'O documento assinado esta disponivel na sua conta.',
    textBody: 'Todos os signatários assinaram o documento: {documentTitle}.\nAcesse: {documentUrl}',
  },
  welcome: {
    subject: 'Bem-vindo ao Connexto Digital Signer',
    greeting: 'Ola {ownerName},',
    body: 'Sua conta foi criada com sucesso. Voce ja pode enviar documentos para assinatura digital.',
    cta: 'Acessar painel',
    footer: 'Obrigado por escolher o Connexto Digital Signer.',
    textBody:
      'Bem-vindo ao Connexto Digital Signer! Sua conta foi criada com sucesso.\nAcesse: {dashboardUrl}',
  },
  'verification-code': {
    subject: 'Seu codigo de verificacao: {code}',
    greeting: 'Ola {signerName},',
    body: 'Use o codigo abaixo para verificar sua identidade antes de assinar o documento <strong>{documentTitle}</strong>.',
    expiry: 'Este codigo expira em 10 minutos.',
    footer: 'Se voce nao solicitou este codigo, por favor ignore este email.',
    textBody:
      'Seu codigo de verificacao e: {code}\nUse-o para verificar sua identidade antes de assinar o documento: {documentTitle}.\nEste codigo expira em 10 minutos.',
  },
} as const;
