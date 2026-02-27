export const emailMessages = {
  'signature-invite': {
    subject: 'Você foi convidado a assinar: {documentTitle}',
    greeting: 'Olá {signerName},',
    body: 'Você foi convidado a assinar o documento <strong>{documentTitle}</strong>.',
    bodyMessage: 'Mensagem do remetente:',
    cta: 'Assinar documento',
    footer: 'Este link é único e não deve ser compartilhado.',
    textBody: 'Você foi convidado a assinar o documento: {documentTitle}.\nAcesse: {signUrl}',
  },
  'signature-reminder': {
    subject: 'Lembrete: assine o documento {documentTitle}',
    greeting: 'Olá {signerName},',
    body: 'Você ainda não assinou o documento <strong>{documentTitle}</strong>. Este é o lembrete {reminderCount} de {maxReminders}.',
    cta: 'Assinar agora',
    footer: 'Este link é único e não deve ser compartilhado.',
    textBody:
      'Lembrete {reminderCount}/{maxReminders}: assine o documento {documentTitle}.\nAcesse: {signUrl}',
  },
  'document-completed': {
    subject: 'Documento concluido: {documentTitle}',
    greeting: 'Olá {ownerName},',
    body: 'Todos os signatários assinaram o documento <strong>{documentTitle}</strong>.',
    cta: 'Ver resumo do documento',
    footer: 'O documento assinado está disponível na sua conta.',
    textBody: 'Todos os signatários assinaram o documento: {documentTitle}.\nAcesse: {documentUrl}',
  },
  welcome: {
    subject: 'Bem-vindo ao NexoSigner',
    greeting: 'Olá {ownerName},',
    body: 'Sua conta foi criada com sucesso. Você já pode enviar documentos para assinatura digital.',
    cta: 'Acessar painel',
    footer: 'Obrigado por escolher o NexoSigner.',
    textBody: 'Bem-vindo ao NexoSigner! Sua conta foi criada com sucesso.\nAcesse: {dashboardUrl}',
  },
  'verification-code': {
    subject: 'Seu codigo de verificacao: {code}',
    greeting: 'Olá {signerName},',
    body: 'Use o codigo abaixo para verificar sua identidade antes de assinar o documento <strong>{documentTitle}</strong>.',
    expiry: 'Este codigo expira em 10 minutos.',
    footer: 'Se você não solicitou este código, por favor ignore este email.',
    textBody:
      'Seu codigo de verificacao e: {code}\nUse-o para verificar sua identidade antes de assinar o documento: {documentTitle}.\nEste codigo expira em 10 minutos.',
  },
} as const;
