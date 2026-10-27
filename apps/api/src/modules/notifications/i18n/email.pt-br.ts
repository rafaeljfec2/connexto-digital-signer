export const emailMessages = {
  shared: {
    brandTagline: 'ASSINATURA ELETRÔNICA',
    footerBrand: 'Nexosign · Assinaturas eletrônicas com rastreabilidade',
    securityNotice: 'Seu link é individual e seguro. Não compartilhe este email.',
    badgeIdentity: 'Identidade verificada',
    badgeIntegrity: 'Integridade do documento',
    badgeIntegrityAlgo: 'SHA-256',
    badgeAudit: 'Trilha de auditoria',
  },
  'signature-invite': {
    subject: 'Você recebeu um documento para assinar: {documentTitle}',
    headline: 'Você recebeu um documento para assinar',
    greeting: 'Olá, <strong>{signerName}</strong>.',
    body: '<strong>{organizationName}</strong> convidou você a assinar o documento:',
    bodyMessage: 'Mensagem do remetente:',
    documentStatus: 'Documento aguardando sua assinatura',
    cta: 'Revisar e assinar documento →',
    textBody:
      'Olá, {signerName}.\n{organizationName} convidou você a assinar o documento: {documentTitle}.\nAcesse: {signUrl}',
  },
  'signature-reminder': {
    subject: 'Lembrete: assine o documento {documentTitle}',
    headline: 'Lembrete de assinatura',
    greeting: 'Olá, <strong>{signerName}</strong>.',
    body: 'Você ainda não assinou o documento. Este é o lembrete <strong>{reminderCount}</strong> de <strong>{maxReminders}</strong>:',
    documentStatus: 'Documento aguardando sua assinatura',
    cta: 'Revisar e assinar documento →',
    textBody:
      'Lembrete {reminderCount}/{maxReminders}: assine o documento {documentTitle}.\nAcesse: {signUrl}',
  },
  'document-completed': {
    subject: 'Documento concluído: {documentTitle}',
    headline: 'Documento assinado com sucesso',
    greeting: 'Olá, <strong>{ownerName}</strong>.',
    body: 'Todos os signatários assinaram o documento:',
    documentStatus: 'Documento concluído',
    cta: 'Ver resumo do documento →',
    textBody:
      'Todos os signatários assinaram o documento: {documentTitle}.\nAcesse: {documentUrl}',
  },
  welcome: {
    subject: 'Bem-vindo ao Nexosign',
    headline: 'Sua conta está pronta',
    greeting: 'Olá, <strong>{ownerName}</strong>.',
    body: 'Sua conta foi criada com sucesso. Você já pode enviar documentos para assinatura eletrônica.',
    cta: 'Acessar painel →',
    textBody:
      'Bem-vindo ao Nexosign! Sua conta foi criada com sucesso.\nAcesse: {dashboardUrl}',
  },
  'verification-code': {
    subject: 'Seu código de verificação: {code}',
    headline: 'Código de verificação',
    greeting: 'Olá, <strong>{signerName}</strong>.',
    body: 'Use o código abaixo para verificar sua identidade antes de assinar o documento <strong>{documentTitle}</strong>.',
    expiry: 'Este código expira em 10 minutos.',
    footer: 'Se você não solicitou este código, ignore este email.',
    textBody:
      'Seu código de verificação é: {code}\nUse-o para verificar sua identidade antes de assinar o documento: {documentTitle}.\nEste código expira em 10 minutos.',
  },
} as const;
