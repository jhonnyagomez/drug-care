import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  CollectionReference,
  Firestore,
} from '@angular/fire/firestore';
import { map, Observable } from 'rxjs';
import { Medicamento } from '../interfaces/medicamento.interface';

@Injectable({
  providedIn: 'root',
})
export class DrugsService {
  constructor(private firestore: Firestore) {}

  obtenerMedicamentos(uid: string): Observable<Medicamento[]> {
    const medicamentosRef = collection(
      this.firestore,
      `usuarios/${uid}/medicamentos`
    ) as CollectionReference<Medicamento>;

    return collectionData(medicamentosRef, { idField: 'id' }).pipe(
      map((docs: any[]) =>
        docs.map(
          (doc) =>
            ({
              ...doc,
              id: doc.id ?? '',
              brandName: doc.brandName ?? [],
              genericName: doc.genericName ?? [],
              purpose: doc.purpose ?? [],
              dosageAndAdministration: doc.dosageAndAdministration ?? [],
              warnings: doc.warnings ?? [],
              activo: doc.activo ?? false,
            } as Medicamento)
        )
      )
    );
  }
}
