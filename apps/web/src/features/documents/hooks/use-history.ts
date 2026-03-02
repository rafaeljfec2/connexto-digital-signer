import { useQuery } from '@tanstack/react-query';
import { listHistory, type ListHistoryParams } from '../api';

export const useHistory = (params: ListHistoryParams) =>
  useQuery({
    queryKey: ['audit', 'history', params],
    queryFn: () => listHistory(params),
    placeholderData: (previous) => previous,
  });
