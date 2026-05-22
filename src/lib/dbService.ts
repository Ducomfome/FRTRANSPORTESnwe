import { supabase, isSupabaseConfigured } from './supabase';
import { Driver, Truck, Trip, TripExpense, Debt, CompanyExpense, CompanyDocument } from '../types';

const ensureConfigured = () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não está configurado. Verifique as variáveis de ambiente.');
  }
};

export const dbService = {
  // Drivers
  async getDrivers() {
    ensureConfigured();
    const { data, error } = await supabase.from('drivers').select('*').order('name');
    if (error) throw error;
    return data as Driver[];
  },
  async addDriver(driver: Omit<Driver, 'id'>) {
    ensureConfigured();
    const { data, error } = await supabase.from('drivers').insert(driver).select().single();
    if (error) throw error;
    return data as Driver;
  },
  async updateDriver(id: string, updates: Partial<Driver>) {
    ensureConfigured();
    if (!id || id === 'undefined') throw new Error('ID do motorista inválido');
    const { data, error } = await supabase.from('drivers').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Driver;
  },
  async deleteDriver(id: string) {
    ensureConfigured();
    if (!id || id === 'undefined') throw new Error('ID do motorista inválido');
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) throw error;
  },

  // Trucks
  async getTrucks() {
    ensureConfigured();
    const { data, error } = await supabase.from('trucks').select('*').order('plate');
    if (error) throw error;
    return data as Truck[];
  },
  async addTruck(truck: Omit<Truck, 'id'>) {
    ensureConfigured();
    const { data, error } = await supabase.from('trucks').insert(truck).select().single();
    if (error) throw error;
    return data as Truck;
  },
  async updateTruck(id: string, updates: Partial<Truck>) {
    ensureConfigured();
    if (!id || id === 'undefined') throw new Error('ID do veículo inválido');
    const { data, error } = await supabase.from('trucks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Truck;
  },
  async deleteTruck(id: string) {
    ensureConfigured();
    if (!id || id === 'undefined') throw new Error('ID do veículo inválido');
    const { error } = await supabase.from('trucks').delete().eq('id', id);
    if (error) throw error;
  },

  // Trips
  async getTrips() {
    ensureConfigured();
    
    try {
      // 1. Fetch flat trips data
      const { data: tripsData, error: tripsError } = await supabase.from('trips')
        .select('*')
        .order('loading_date', { ascending: false });

      if (tripsError) throw tripsError;
      if (!tripsData) return [];

      // 2. Fetch drivers and trucks in parallel to stitch in memory.
      // This is 100% resilient and avoids any relationship resolution or PostgREST cache issues.
      const [driversRes, trucksRes] = await Promise.all([
        supabase.from('drivers').select('id, name'),
        supabase.from('trucks').select('id, plate, model')
      ]);

      const driverMap = new Map((driversRes.data || []).map(d => [d.id, { name: d.name }]));
      const truckMap = new Map((trucksRes.data || []).map(t => [t.id, { plate: t.plate, model: t.model }]));

      return tripsData.map((trip: any) => ({
        ...trip,
        drivers: trip.driver_id ? driverMap.get(trip.driver_id) || null : null,
        trucks: trip.truck_id ? truckMap.get(trip.truck_id) || null : null
      }));
    } catch (e: any) {
      console.error('Core Trips query failed, trying standard fallback:', e);
      
      // Fallback in case of absolute emergency
      const { data, error } = await supabase.from('trips')
        .select('*')
        .order('loading_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  },
  async addTrip(trip: Omit<Trip, 'id'>) {
    ensureConfigured();
    const { data, error } = await supabase.from('trips').insert(trip).select().single();
    if (error) throw error;
    return data;
  },
  async updateTrip(id: string, updates: Partial<Trip>) {
    ensureConfigured();
    if (!id || id === 'undefined') throw new Error('ID do frete inválido');
    const { data, error } = await supabase.from('trips').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteTrip(id: string) {
    ensureConfigured();
    if (!id || id === 'undefined') throw new Error('ID do frete inválido');
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) throw error;
  },

  async mergeTrips(sourceId: string, targetId: string) {
    ensureConfigured();
    
    // 1. Get Source Trip data
    const { data: sourceTrip, error: sourceError } = await supabase
      .from('trips')
      .select('freight_value')
      .eq('id', sourceId)
      .single();
    if (sourceError) throw sourceError;

    // 2. Get Target Trip data
    const { data: targetTrip, error: targetError } = await supabase
      .from('trips')
      .select('freight_value')
      .eq('id', targetId)
      .single();
    if (targetError) throw targetError;

    // 3. Move all expenses from source to target
    const { error: moveError } = await supabase
      .from('trip_expenses')
      .update({ trip_id: targetId })
      .eq('trip_id', sourceId);
    if (moveError) throw moveError;

    // 4. Update target freight value (sum both)
    const newFreight = (targetTrip.freight_value || 0) + (sourceTrip.freight_value || 0);
    const { error: updateError } = await supabase
      .from('trips')
      .update({ freight_value: newFreight })
      .eq('id', targetId);
    if (updateError) throw updateError;

    // 5. Delete source trip
    const { error: deleteError } = await supabase
      .from('trips')
      .delete()
      .eq('id', sourceId);
    if (deleteError) throw deleteError;

    return true;
  },

  // Debts
  async getDebts() {
    ensureConfigured();
    const { data, error } = await supabase.from('debts').select('*').order('due_date');
    if (error) throw error;
    return data;
  },
  async addDebt(debt: any) {
    ensureConfigured();
    const { data, error } = await supabase.from('debts').insert(debt).select().single();
    if (error) throw error;
    return data;
  },
  async updateDebt(id: string, updates: any) {
    ensureConfigured();
    const { data, error } = await supabase.from('debts').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteDebt(id: string) {
    ensureConfigured();
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (error) throw error;
  },

  // Storage / Files
  async uploadFile(bucket: string, path: string, file: File) {
    if (!isSupabaseConfigured) {
      console.log('Supabase não configurado. Utilizando fallback Base64...');
      return this._fileToBase64(file);
    }
    try {
      const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true
      });
      if (error) {
        console.warn('Falha no upload para o Supabase Storage. Tentando fallback Base64...', error);
        throw error;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      return publicUrl;
    } catch (storageError: any) {
      console.log('Utilizando fallback Base64 auto-armazenável...');
      return this._fileToBase64(file);
    }
  },

  async _fileToBase64(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  },

  async deleteFile(bucket: string, path: string) {
    ensureConfigured();
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  },

  // Company Expenses
  async getCompanyExpenses() {
    ensureConfigured();
    const { data, error } = await supabase.from('company_expenses').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data as CompanyExpense[];
  },
  async addCompanyExpense(expense: Omit<CompanyExpense, 'id' | 'created_at'>) {
    ensureConfigured();
    const { data, error } = await supabase.from('company_expenses').insert(expense).select().single();
    if (error) throw error;
    return data as CompanyExpense;
  },
  async updateCompanyExpense(id: string, updates: Partial<CompanyExpense>) {
    ensureConfigured();
    const { data, error } = await supabase.from('company_expenses').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as CompanyExpense;
  },
  async deleteCompanyExpense(id: string) {
    ensureConfigured();
    const { error } = await supabase.from('company_expenses').delete().eq('id', id);
    if (error) throw error;
  },

  // Trip Expenses
  async getTripExpenses(tripId: string) {
    ensureConfigured();
    const { data, error } = await supabase.from('trip_expenses').select('*').eq('trip_id', tripId).order('date');
    if (error) throw error;
    return data as TripExpense[];
  },
  async addTripExpense(expense: Omit<TripExpense, 'id'>) {
    ensureConfigured();
    const { data, error } = await supabase.from('trip_expenses').insert(expense).select().single();
    if (error) throw error;
    return data as TripExpense;
  },
  async updateTripExpense(id: string, updates: Partial<TripExpense>) {
    ensureConfigured();
    const { data, error } = await supabase.from('trip_expenses').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as TripExpense;
  },
  async deleteTripExpense(id: string) {
    ensureConfigured();
    const { error } = await supabase.from('trip_expenses').delete().eq('id', id);
    if (error) throw error;
  },

  // Reminders
  async getReminders() {
    ensureConfigured();
    const { data, error } = await supabase.from('reminders').select('*').order('date');
    if (error) throw error;
    return data;
  },
  async addReminder(reminder: any) {
    ensureConfigured();
    const { data, error } = await supabase.from('reminders').insert(reminder).select().single();
    if (error) throw error;
    return data;
  },
  async updateReminder(id: string, updates: any) {
    ensureConfigured();
    const { data, error } = await supabase.from('reminders').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteReminder(id: string) {
    ensureConfigured();
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) throw error;
  },

  // Company Documents
  async getCompanyDocuments() {
    const localDocs = this._getLocalDocuments();
    if (!isSupabaseConfigured) {
      return localDocs;
    }
    try {
      const { data, error } = await supabase.from('company_documents').select('*').order('created_at', { ascending: false });
      if (error) {
        const msg = error.message.toLowerCase();
        if (
          error.code === '42P01' || 
          msg.includes('does not exist') || 
          msg.includes('not found') || 
          (msg.includes('relation') && msg.includes('company_documents')) ||
          error.code === 'PGRST116'
        ) {
          console.warn('Tabela company_documents não existe no Supabase. Usando armazenamento local.');
          return localDocs;
        }
        throw error;
      }
      
      const supabaseDocs = (data || []) as CompanyDocument[];
      // Merge local and supabase docs by ID, preferring supabase items
      const mergedMap = new Map<string, CompanyDocument>();
      localDocs.forEach(d => mergedMap.set(d.id, d));
      supabaseDocs.forEach(d => mergedMap.set(d.id, d));
      
      const mergedList = Array.from(mergedMap.values());
      // Sort descending by created_at
      mergedList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return mergedList;
    } catch (e) {
      console.warn('Erro ao carregar documentos do Supabase, caindo para local:', e);
      return localDocs;
    }
  },

  _getLocalDocuments(): CompanyDocument[] {
    const docs = localStorage.getItem('company_documents');
    return docs ? JSON.parse(docs) : [];
  },

  async addCompanyDocument(document: Omit<CompanyDocument, 'id' | 'created_at'>) {
    const newDoc: CompanyDocument = {
      ...document,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      created_at: new Date().toISOString()
    };

    // Always persist locally first so it will show up immediately
    this._saveLocalDocument(newDoc);

    if (!isSupabaseConfigured) {
      return newDoc;
    }

    try {
      const { data, error } = await supabase.from('company_documents').insert({
        id: newDoc.id,
        title: newDoc.title,
        category: newDoc.category,
        file_url: newDoc.file_url,
        expiration_date: newDoc.expiration_date,
        created_at: newDoc.created_at
      }).select().single();

      if (error) {
        console.warn('Erro ao salvar no Supabase ao adicionar documento, mas já está persistido localmente:', error);
        return newDoc;
      }
      return data as CompanyDocument;
    } catch (e) {
      console.warn('Erro ao salvar documento no Supabase ao adicionar, mas já está persistido localmente:', e);
      return newDoc;
    }
  },

  _saveLocalDocument(doc: CompanyDocument) {
    const docs = this._getLocalDocuments();
    // Evita duplicar localmente
    const filtered = docs.filter(d => d.id !== doc.id);
    filtered.unshift(doc);
    localStorage.setItem('company_documents', JSON.stringify(filtered));
  },

  async deleteCompanyDocument(id: string) {
    // Always delete locally
    this._deleteLocalDocument(id);
    
    if (!isSupabaseConfigured) {
      return;
    }
    try {
      const { error } = await supabase.from('company_documents').delete().eq('id', id);
      if (error) {
        console.warn('Erro ao deletar no Supabase, mas já deletado localmente:', error);
      }
    } catch (e) {
      console.warn('Erro ao deletar no Supabase, mas já deletado localmente:', e);
    }
  },

  _deleteLocalDocument(id: string) {
    const docs = this._getLocalDocuments();
    const filtered = docs.filter(d => d.id !== id);
    localStorage.setItem('company_documents', JSON.stringify(filtered));
  }
};
