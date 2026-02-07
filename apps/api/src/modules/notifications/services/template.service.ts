import { Injectable } from '@nestjs/common';
import { renderSignatureInvite } from '../templates/signature-invite';
import { renderSignatureReminder } from '../templates/signature-reminder';
import { renderDocumentCompleted } from '../templates/document-completed';
import { renderWelcome } from '../templates/welcome';
import { renderVerificationCode } from '../templates/verification-code';

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class TemplateService {
  renderTemplate(
    template: string,
    context: Record<string, unknown>,
    locale = 'en',
  ): RenderedEmail {
    switch (template) {
      case 'signature-invite':
        return renderSignatureInvite(
          context as unknown as Parameters<typeof renderSignatureInvite>[0],
          locale,
        );
      case 'signature-reminder':
        return renderSignatureReminder(
          context as unknown as Parameters<typeof renderSignatureReminder>[0],
          locale,
        );
      case 'document-completed':
        return renderDocumentCompleted(
          context as unknown as Parameters<typeof renderDocumentCompleted>[0],
          locale,
        );
      case 'welcome':
        return renderWelcome(
          context as unknown as Parameters<typeof renderWelcome>[0],
          locale,
        );
      case 'verification-code':
        return renderVerificationCode(
          context as unknown as Parameters<typeof renderVerificationCode>[0],
          locale,
        );
      default:
        return {
          subject: '',
          text: JSON.stringify(context),
          html: `<pre>${JSON.stringify(context, null, 2)}</pre>`,
        };
    }
  }
}
