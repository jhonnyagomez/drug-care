import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Medicamento } from '../interfaces/medicamento.interface';

@Injectable({
  providedIn: 'root',
})
export class DrugsService {
  constructor(private firestore: Firestore) {}

  getAllUserMedicamentos(userId: string): Observable<Medicamento[]> {
    return new Observable<Medicamento[]>((observer) => {
      const medicamentosRef = collection(
        this.firestore,
        `usuarios/${userId}/medicamentos`
      );

      const unsubscribe = onSnapshot(
        medicamentosRef,
        (querySnapshot: QuerySnapshot<DocumentData>) => {
          const medicamentos: Medicamento[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data() as Omit<Medicamento, 'id'>;
            medicamentos.push({ ...data, id: doc.id });
          });
          observer.next(medicamentos);
        },
        (error) => {
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  // Método para eliminar medicamento
  async deleteMedicamento(
    userId: string,
    medicamentoId: string
  ): Promise<void> {
    try {
      const medicamentoDocRef = doc(
        this.firestore,
        `usuarios/${userId}/medicamentos/${medicamentoId}`
      );
      await deleteDoc(medicamentoDocRef);
      console.log('Medicamento eliminado exitosamente de Firestore');
    } catch (error) {
      console.error('Error al eliminar medicamento:', error);
      throw error;
    }
  }

  // Método para actualizar la próxima dosis cuando se marca como tomado
  async marcarMedicamentoComoTomado(
  userId: string,
  medicamentoId: string,
  nuevaProximaDosis: Date
): Promise<void> {
  try {
    console.log('=== ACTUALIZANDO EN FIREBASE ===');
    console.log('Usuario ID:', userId);
    console.log('Medicamento ID:', medicamentoId);
    console.log('Nueva próxima dosis:', nuevaProximaDosis);
    console.log('Timestamp a guardar:', Timestamp.fromDate(nuevaProximaDosis));

    const medicamentoDocRef = doc(
      this.firestore,
      `usuarios/${userId}/medicamentos/${medicamentoId}`
    );

    const updateData = {
      proximaDosis: Timestamp.fromDate(nuevaProximaDosis),
      estado: 'activo',
      ultimaActualizacion: Timestamp.now() // Agregar timestamp de última actualización
    };

    console.log('Datos a actualizar:', updateData);

    await updateDoc(medicamentoDocRef, updateData);

    console.log('✅ Medicamento actualizado exitosamente en Firebase');
    console.log('===============================');
  } catch (error) {
    console.error('❌ Error al actualizar medicamento en Firebase:', error);
    throw error;
  }
}
}
