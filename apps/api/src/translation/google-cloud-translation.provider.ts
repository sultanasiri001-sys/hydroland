import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { TranslationProvider, TranslationRequest, TranslationResult } from './translation-provider';

type GoogleTranslationResponse = {
  data?: {
    translations?: Array<{
      translatedText?: unknown;
    }>;
  };
};

@Injectable()
export class GoogleCloudTranslationProvider implements TranslationProvider {
  readonly id = 'GOOGLE_CLOUD_TRANSLATION';
  readonly mode = 'ONLINE' as const;

  async isAvailable(): Promise<boolean> {
    return (
      process.env.HYDROLAND_TRANSLATION_PROVIDER?.trim().toUpperCase() === 'GOOGLE_CLOUD' &&
      Boolean(process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY?.trim())
    );
  }

  supports(sourceLanguage: string, targetLanguage: string): boolean {
    return Boolean(sourceLanguage && targetLanguage && sourceLanguage !== targetLanguage);
  }

  async translate(input: TranslationRequest): Promise<TranslationResult> {
    if (process.env.HYDROLAND_TRANSLATION_PROVIDER?.trim().toUpperCase() !== 'GOOGLE_CLOUD') {
      throw new ServiceUnavailableException('Translation provider is not configured.');
    }
    const apiKey = process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY?.trim();
    if (!apiKey) throw new ServiceUnavailableException('Translation provider credentials are not configured.');

    if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 20_000) {
      throw new ServiceUnavailableException('Translation input is unavailable or exceeds the provider limit.');
    }

    let response: Response;
    try {
      response = await fetch('https://translation.googleapis.com/language/translate/v2', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          q: input.text,
          source: input.sourceLanguage,
          target: input.targetLanguage,
          format: 'text',
        }),
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new BadGatewayException('Translation provider request failed.');
    }

    let payload: GoogleTranslationResponse = {};
    try {
      payload = (await response.json()) as GoogleTranslationResponse;
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new BadGatewayException(`Translation provider rejected the request (${response.status}).`);
    }

    const translatedText = payload.data?.translations?.[0]?.translatedText;
    if (typeof translatedText !== 'string' || !translatedText.length) {
      throw new BadGatewayException('Translation provider returned an invalid response.');
    }

    return { translatedText, provider: this.id };
  }
}
