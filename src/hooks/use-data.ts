'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPersons, getActivePersons, getPerson, createPerson, updatePerson, deletePerson } from '@/actions/person.actions';
import { getPayments, getPaymentsByPerson, getPayment, createPayment, updatePayment, deletePayment, getPaymentStats } from '@/actions/payment.actions';
import { getDashboardStats } from '@/actions/dashboard.actions';

export function usePersons() {
  return useQuery({
    queryKey: ['persons'],
    queryFn: getPersons,
  });
}

export function useActivePersons() {
  return useQuery({
    queryKey: ['persons', 'active'],
    queryFn: getActivePersons,
  });
}

export function usePerson(id: string) {
  return useQuery({
    queryKey: ['person', id],
    queryFn: () => getPerson(id),
    enabled: !!id,
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPerson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => updatePerson(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePerson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: getPayments,
  });
}

export function usePaymentsByPerson(personId: string) {
  return useQuery({
    queryKey: ['payments', personId],
    queryFn: () => getPaymentsByPerson(personId),
    enabled: !!personId,
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: () => getPayment(id),
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => updatePayment(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function usePaymentStats() {
  return useQuery({
    queryKey: ['paymentStats'],
    queryFn: getPaymentStats,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
  });
}