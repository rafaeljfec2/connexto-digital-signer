import { useCallback, useEffect, useMemo, useState } from 'react';

import { SignatureFieldData, SignatureFieldValue } from '../types';

type UsePdfFieldsOptions = Readonly<{
  initialFields?: SignatureFieldData[];
}>;

type AddFieldInput = Omit<SignatureFieldData, 'id'> & { readonly id?: string };
type UpdateFieldInput = Partial<Omit<SignatureFieldData, 'id'>> & {
  readonly id: string;
};

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const usePdfFields = ({ initialFields }: UsePdfFieldsOptions) => {
  const [fields, setFields] = useState<SignatureFieldData[]>(() => initialFields ?? []);

  useEffect(() => {
    if (!initialFields) {
      return;
    }
    setFields(initialFields);
  }, [initialFields]);

  const addField = useCallback((input: AddFieldInput) => {
    const nextField: SignatureFieldData = {
      ...input,
      id: input.id ?? createId(),
    };
    setFields((current) => [...current, nextField]);
    return nextField;
  }, []);

  const moveField = useCallback((input: UpdateFieldInput) => {
    setFields((current) =>
      current.map((field) => (field.id === input.id ? { ...field, ...input } : field))
    );
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((current) => current.filter((field) => field.id !== id));
  }, []);

  const updateFieldValue = useCallback((id: string, value: SignatureFieldValue) => {
    setFields((current) =>
      current.map((field) => (field.id === id ? { ...field, value } : field))
    );
  }, []);

  const apiPayload = useMemo(() => fields, [fields]);

  return {
    fields,
    addField,
    moveField,
    removeField,
    updateFieldValue,
    apiPayload,
  };
};
