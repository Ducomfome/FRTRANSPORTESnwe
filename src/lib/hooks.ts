import { useState, useEffect, useCallback } from 'react';
import { dbService } from './dbService';
import { Driver, Truck, Trip, Debt, CompanyExpense } from '../types';
import { useToast } from '../components/ui/Toast';

export function useDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dbService.getDrivers();
      setDrivers(data);
    } catch (error) {
      showToast('Erro ao carregar motoristas', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  return { drivers, loading, refresh: fetchDrivers };
}

export function useTrucks() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchTrucks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dbService.getTrucks();
      setTrucks(data);
    } catch (error) {
      showToast('Erro ao carregar frota', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTrucks();
  }, [fetchTrucks]);

  return { trucks, loading, refresh: fetchTrucks };
}

export function useTrips() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dbService.getTrips();
      setTrips(data);
    } catch (error) {
      showToast('Erro ao carregar fretes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return { trips, loading, refresh: fetchTrips };
}

export function useDebts() {
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchDebts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dbService.getDebts();
      setDebts(data);
    } catch (error) {
      showToast('Erro ao carregar dívidas', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  return { debts, loading, refresh: fetchDebts };
}

export function useCompanyExpenses() {
  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dbService.getCompanyExpenses();
      setExpenses(data);
    } catch (error) {
      showToast('Erro ao carregar gastos da empresa', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return { expenses, loading, refresh: fetchExpenses };
}
