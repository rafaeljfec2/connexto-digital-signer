import { useQuery } from '@tanstack/react-query';
import { searchSignerDocuments } from '../api';

export const useSignerDocuments = (query: string) =>
  useQuery({
    queryKey: ['signers', 'search-documents', query],
    queryFn: () => searchSignerDocuments(query),
    enabled: query.length >= 3,
  });
