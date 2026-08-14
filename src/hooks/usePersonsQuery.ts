import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPersons,
  getPersonGroups,
  getPersonRoles,
  addPersonGroup,
  updatePersonGroup,
  deletePersonGroup,
  addPersonRole,
  updatePersonRole,
  deletePersonRole,
  savePerson,
  deletePerson
} from '../services/personService';

export const PERSONS_QUERY_KEY = ['persons'];
export const PERSON_GROUPS_QUERY_KEY = ['personGroups'];
export const PERSON_ROLES_QUERY_KEY = ['personRoles'];

export function usePersons() {
  return useQuery({
    queryKey: PERSONS_QUERY_KEY,
    queryFn: getPersons,
  });
}

export function usePersonGroups() {
  return useQuery({
    queryKey: PERSON_GROUPS_QUERY_KEY,
    queryFn: getPersonGroups,
  });
}

export function usePersonRoles() {
  return useQuery({
    queryKey: PERSON_ROLES_QUERY_KEY,
    queryFn: getPersonRoles,
  });
}

export function useSavePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (personData: any) => savePerson(personData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONS_QUERY_KEY });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deletePerson(String(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONS_QUERY_KEY });
    },
  });
}

export function useSavePersonGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, group }: { id?: string; group: any }) => {
      if (id) {
        return updatePersonGroup(id, group);
      }
      return addPersonGroup(group);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSON_GROUPS_QUERY_KEY });
    },
  });
}

export function useDeletePersonGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePersonGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSON_GROUPS_QUERY_KEY });
    },
  });
}

export function useSavePersonRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id?: string; role: any }) => {
      if (id) {
        return updatePersonRole(id, role);
      }
      return addPersonRole(role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSON_ROLES_QUERY_KEY });
    },
  });
}

export function useDeletePersonRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePersonRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSON_ROLES_QUERY_KEY });
    },
  });
}
