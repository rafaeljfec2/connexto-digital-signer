import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  addTemplateDocument,
  removeTemplateDocument,
  addTemplateSigner,
  updateTemplateSigner,
  removeTemplateSigner,
  batchUpdateTemplateFields,
  batchUpdateTemplateVariables,
  createEnvelopeFromTemplate,
  createTemplateFromEnvelope,
  type ListTemplatesParams,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type AddTemplateSignerInput,
  type UpdateTemplateSignerInput,
  type TemplateFieldInput,
  type TemplateVariableInput,
  type CreateEnvelopeFromTemplateInput,
  type CreateTemplateFromEnvelopeInput,
} from './api';

const TEMPLATES_KEY = 'templates';

export function useTemplates(params?: ListTemplatesParams) {
  return useQuery({
    queryKey: [TEMPLATES_KEY, 'list', params],
    queryFn: () => listTemplates(params),
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: [TEMPLATES_KEY, 'detail', id],
    queryFn: () => getTemplate(id),
    enabled: Boolean(id),
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTemplateInput) => createTemplate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY, 'list'] });
    },
  });
}

export function useUpdateTemplate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTemplateInput) => updateTemplate(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY, 'list'] });
    },
  });
}

export function useAddTemplateDocument(templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, title, position }: { file: File; title: string; position?: number }) =>
      addTemplateDocument(templateId, file, title, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY, 'detail', templateId] });
    },
  });
}

export function useRemoveTemplateDocument(templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => removeTemplateDocument(templateId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY, 'detail', templateId] });
    },
  });
}

export function useAddTemplateSigner(templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddTemplateSignerInput) => addTemplateSigner(templateId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY, 'detail', templateId] });
    },
  });
}

export function useUpdateTemplateSigner(templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ signerId, input }: { signerId: string; input: UpdateTemplateSignerInput }) =>
      updateTemplateSigner(templateId, signerId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY, 'detail', templateId] });
    },
  });
}

export function useRemoveTemplateSigner(templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (signerId: string) => removeTemplateSigner(templateId, signerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY, 'detail', templateId] });
    },
  });
}

export function useBatchUpdateTemplateFields(templateId: string, docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields: ReadonlyArray<TemplateFieldInput>) =>
      batchUpdateTemplateFields(templateId, docId, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY, 'detail', templateId] });
    },
  });
}

export function useBatchUpdateTemplateVariables(templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: ReadonlyArray<TemplateVariableInput>) =>
      batchUpdateTemplateVariables(templateId, variables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY, 'detail', templateId] });
    },
  });
}

export function useCreateEnvelopeFromTemplate(templateId: string) {
  return useMutation({
    mutationFn: (input: CreateEnvelopeFromTemplateInput) =>
      createEnvelopeFromTemplate(templateId, input),
  });
}

export function useCreateTemplateFromEnvelope() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ envelopeId, input }: { envelopeId: string; input: CreateTemplateFromEnvelopeInput }) =>
      createTemplateFromEnvelope(envelopeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY, 'list'] });
    },
  });
}
