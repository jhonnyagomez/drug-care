import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DrugsService } from '../../services/drugs.service';
import { Medicamento } from '../../interfaces/medicamento.interface';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  medicamentos: Medicamento[] = [];
  nombreUsuario: string = 'Usuario';

  private medicamentosYaAlertados: Set<string> = new Set();
  private medicamentosNotificados: Set<string> = new Set();

  audio = new Audio('/alert.mp3');

  medicamentosActivos: number = 0;
  proximaDosisHora: string = '';
  proximaDosisNombre: string = '';
  dosisHoy: number = 0;
  totalDosisHoy: number = 0;

  notificacionesActivas: Array<{
    id: string;
    mensaje: string;
    tipo: 'warning' | 'error' | 'info';
  }> = [];

  // Sonido de alerta (opcional)
  private audioAlerta: HTMLAudioElement | null = null;

  // NUEVO: Cache para las próximas dosis del día
  proximasDosisDelDia: Array<{
    medicamento: string;
    hora: Date;
    estado: string;
  }> = [];

  mostrarModalComingSoon = false;

  constructor(
    private router: Router,
    private medicamentoService: DrugsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.calcularStats();

    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.nombreUsuario = user.displayName || user.email || 'Usuario';
        this.medicamentoService
          .getAllUserMedicamentos(user.uid)
          .subscribe((data) => {
            console.log('📦 Medicamentos cargados desde Firebase:', data);

            this.medicamentos = data.map((med) => {
              const medicamentoProcesado = {
                ...med,
                proximaDosis: this.convertirADate(med.proximaDosis),
              };

              console.log(
                `🔄 Procesando ${this.obtenerNombrePrincipal(
                  medicamentoProcesado
                )}: Estado=${med.estado}, Próxima=${
                  medicamentoProcesado.proximaDosis
                }`
              );

              return medicamentoProcesado;
            });

            this.actualizarProximasDosis();
            this.actualizarEstados();
            this.calcularStats();
            this.actualizarProximasDosisDelDia();

            console.log('✅ Datos actualizados y notificaciones reprogramadas');
          });
      } else {
        console.error('Usuario no autenticado');
      }
    });

    // Actualizar cada minuto E incluir verificación de alertas
    setInterval(() => {
      this.actualizarProximasDosis();
      this.actualizarEstados();
      this.calcularStats();
      this.actualizarProximasDosisDelDia();
      this.verificarAlertasDosis(); // NUEVA LÍNEA
    }, 60000);
  }

  private verificarAlertasDosis(): void {
    const ahora = new Date();

    this.medicamentos.forEach((medicamento) => {
      if (!medicamento.activo) return;

      const proximaDosis = this.convertirADate(medicamento.proximaDosis);

      // Si la próxima dosis ya pasó (está vencida)
      if (proximaDosis <= ahora) {
        const medicamentoId = medicamento.id;

        // Solo alertar una vez por medicamento
        if (!this.medicamentosYaAlertados.has(medicamentoId)) {
          const nombre = this.obtenerNombrePrincipal(medicamento);
          alert(`⏰ Es hora de tomar: ${nombre}`);

          this.medicamentosYaAlertados.add(medicamentoId);

          // Limpiar el registro después de 5 minutos
          setTimeout(() => {
            this.medicamentosYaAlertados.delete(medicamentoId);
          }, 300000);
        }
      }
    });
  }

  // Verificar notificaciones cada 30 segundos
  // Método para convertir timestamps de Firebase a Date
  private convertirADate(timestamp: any): Date {
    if (!timestamp) return new Date();

    // Si ya es un Date
    if (timestamp instanceof Date) {
      return timestamp;
    }

    // Si es un timestamp de Firebase con método toDate()
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }

    // Si es un timestamp en segundos (Firebase)
    if (typeof timestamp === 'object' && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }

    // Si es un timestamp en milisegundos
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }

    // Si es una string
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }

    return new Date();
  }

  cargarDatosUsuario(): void {
    this.nombreUsuario = localStorage.getItem('nombreUsuario') || 'Usuario';
  }

  calcularProximaDosisDesdeAhora(frecuenciaHoras: number): Date {
    const ahora = new Date();
    const proximaDosis = new Date(
      ahora.getTime() + frecuenciaHoras * 60 * 60 * 1000
    );
    return proximaDosis;
  }

  calcularProximaDosis(horaInicio: string, frecuenciaHoras: number): Date {
    const ahora = new Date();
    const [hora, minuto] = horaInicio.split(':').map(Number);

    // Crear fecha para la primera dosis de hoy
    const primeraDosisHoy = new Date();
    primeraDosisHoy.setHours(hora, minuto, 0, 0);

    // Si la primera dosis de hoy ya pasó, calcular desde la última dosis teórica
    if (primeraDosisHoy <= ahora) {
      // Calcular cuántas dosis han pasado desde la primera dosis de hoy
      const tiempoTranscurrido = ahora.getTime() - primeraDosisHoy.getTime();
      const dosisTranscurridas = Math.floor(
        tiempoTranscurrido / (frecuenciaHoras * 60 * 60 * 1000)
      );

      // La próxima dosis será la siguiente después de las que ya pasaron
      const proximaDosis = new Date(
        primeraDosisHoy.getTime() +
          (dosisTranscurridas + 1) * frecuenciaHoras * 60 * 60 * 1000
      );
      return proximaDosis;
    } else {
      // Si la primera dosis de hoy aún no ha llegado, esa es la próxima
      return primeraDosisHoy;
    }
  }

  actualizarProximasDosis(): void {
    const ahora = new Date();

    this.medicamentos.forEach((medicamento) => {
      if (!medicamento.activo) return;

      const proximaDosis = this.convertirADate(medicamento.proximaDosis);

      // Solo recalcular si la próxima dosis ya pasó
      if (proximaDosis <= ahora) {
        const nuevaProximaDosis = this.calcularProximaDosis(
          medicamento.horaInicio,
          medicamento.frecuenciaHoras
        );
        medicamento.proximaDosis = nuevaProximaDosis;
      }
    });
  }

  actualizarEstados(): void {
    const ahora = new Date();

    this.medicamentos.forEach((medicamento) => {
      if (!medicamento.activo) {
        medicamento.estado = 'activo';
        return;
      }

      const proximaDosis = this.convertirADate(medicamento.proximaDosis);
      if (!proximaDosis || isNaN(proximaDosis.getTime())) {
        console.warn('Fecha inválida para medicamento:', medicamento.id);
        medicamento.estado = 'activo';
        return;
      }

      medicamento.proximaDosis = proximaDosis;
      const tiempoHastaProximaDosis = proximaDosis.getTime() - ahora.getTime();
      const minutosHastaProximaDosis = tiempoHastaProximaDosis / (1000 * 60);

      console.log('---------------------------------------------');
      console.log(ahora.toLocaleString());
      console.log(medicamento.proximaDosis.toLocaleString());

      // Mostrar alerta solo si no se ha mostrado en los últimos 2 minutos
      if (
        Math.abs(minutosHastaProximaDosis) < 1 &&
        !this.medicamentosNotificados.has(medicamento.id)
      ) {
        this.audio.currentTime = 0;
        this.audio.play();
        alert(
          `⏰ Es hora de tomar: ${this.obtenerNombrePrincipal(medicamento)}`
        );
        this.medicamentosNotificados.add(medicamento.id);

        // Quitar del set después de 2 minutos (120000 ms)
        setTimeout(() => {
          this.medicamentosNotificados.delete(medicamento.id);
        }, 320000);
      }

      console.log(
        `${this.obtenerNombrePrincipal(medicamento)}: ${Math.round(
          minutosHastaProximaDosis
        )} minutos hasta próxima dosis`
      );

      if (tiempoHastaProximaDosis <= 0) {
        medicamento.estado = 'vencido';
      } else if (minutosHastaProximaDosis <= 30) {
        medicamento.estado = 'proximo';
      } else {
        medicamento.estado = 'activo';
      }

      console.log(`Estado asignado: ${medicamento.estado}`);
    });
  }

  calcularStats(): void {
    const ahora = new Date();
    let dosisTotales = 0;
    let dosisTomadas = 0;

    // Contar medicamentos activos
    this.medicamentosActivos = this.medicamentos.filter(
      (m) => m.activo === true
    ).length;

    // Calcular dosis del día actual
    this.medicamentos.forEach((medicamento) => {
      if (!medicamento.activo) return;

      const horaInicio = medicamento.horaInicio;
      const frecuencia = medicamento.frecuenciaHoras;
      const inicioDelDia = new Date();
      inicioDelDia.setHours(0, 0, 0, 0);
      const finDelDia = new Date();
      finDelDia.setHours(23, 59, 59, 999);

      const [hora, minuto] = horaInicio.split(':').map(Number);
      let dosisHora = new Date(inicioDelDia);
      dosisHora.setHours(hora, minuto, 0, 0);

      // Contar todas las dosis del día
      while (dosisHora <= finDelDia) {
        dosisTotales++;

        // Si la dosis ya pasó, contarla como tomada
        if (dosisHora < ahora) {
          dosisTomadas++;
        }

        // Avanzar a la siguiente dosis
        dosisHora = new Date(dosisHora.getTime() + frecuencia * 60 * 60 * 1000);
      }
    });

    this.dosisHoy = dosisTomadas;
    this.totalDosisHoy = dosisTotales;
  }

  formatearHora(fecha: Date): string {
    return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  obtenerNombrePrincipal(med: Medicamento): string {
    return med.genericName?.[0] || 'Sin nombre';
  }

  obtenerDosisPrincipal(med: Medicamento): string {
    return med.dosageAndAdministration?.[0] || 'Dosis no especificada';
  }

  obtenerProposito(medicamento: Medicamento): string {
    return medicamento.purpose && medicamento.purpose.length > 0
      ? medicamento.purpose[0]
      : 'Medicamento';
  }

  obtenerTextoFrecuencia(frecuencia: number): string {
    return `Cada ${frecuencia} horas`;
  }

  irAgregarMedicamento(): void {
    this.router.navigate(['dashboard/add']);
  }

  abrirModalComingSoon(): void {
    this.mostrarModalComingSoon = true;
  }

  cerrarModalComingSoon(): void {
    this.mostrarModalComingSoon = false;
  }

  editarMedicamento(medicamento: Medicamento): void {
    this.router.navigate(['/editar-medicamento', medicamento.id]);
  }

  async eliminarMedicamento(medicamento: Medicamento): Promise<void> {
    const nombre = this.obtenerNombrePrincipal(medicamento);

    if (confirm(`¿Estás seguro de que quieres eliminar ${nombre}?`)) {
      try {
        const user = await firstValueFrom(this.authService.currentUser$);
        if (!user) {
          console.error('Usuario no autenticado');
          alert('Error: Usuario no autenticado');
          return;
        }

        await this.medicamentoService.deleteMedicamento(
          user.uid,
          medicamento.id
        );

        console.log('Medicamento eliminado exitosamente:', medicamento.id);
        alert(`${nombre} ha sido eliminado exitosamente`);
      } catch (error) {
        console.error('Error al eliminar medicamento:', error);
        alert('Error al eliminar el medicamento. Por favor, intenta de nuevo.');
      }
    }
  }

  inicializarNuevoMedicamento(medicamento: Medicamento): Medicamento {
    const proximaDosis = this.calcularProximaDosis(
      medicamento.horaInicio,
      medicamento.frecuenciaHoras
    );

    const ahora = new Date();
    const minutosHasta =
      (proximaDosis.getTime() - ahora.getTime()) / (1000 * 60);

    let estadoInicial: 'activo' | 'proximo' | 'vencido';
    if (minutosHasta <= 0) {
      estadoInicial = 'vencido';
    } else if (minutosHasta <= 30) {
      estadoInicial = 'proximo';
    } else {
      estadoInicial = 'activo';
    }

    return {
      ...medicamento,
      proximaDosis: proximaDosis,
      estado: estadoInicial,
    };
  }

  // MEJORADO: Marcar como tomado y actualizar inmediatamente la lista
  async marcarComoTomado(medicamento: Medicamento): Promise<void> {
    try {
      const user = await firstValueFrom(this.authService.currentUser$);
      if (!user) {
        console.error('Usuario no autenticado');
        alert('Error: Usuario no autenticado');
        return;
      }

      const ahora = new Date();
      const nuevaProximaDosis = new Date(
        ahora.getTime() + medicamento.frecuenciaHoras * 60 * 60 * 1000
      );

      console.log('⏰ Marcando como tomado...');
      console.log('Hora actual:', ahora.toLocaleString());
      console.log(
        'Nueva próxima dosis calculada:',
        nuevaProximaDosis.toLocaleString()
      );

      // Actualizar en Firebase
      await this.medicamentoService.marcarMedicamentoComoTomado(
        user.uid,
        medicamento.id,
        nuevaProximaDosis
      );

      // IMPORTANTE: Limpiar notificaciones del medicamento actual

      // Actualizar localmente INMEDIATAMENTE
      medicamento.proximaDosis = nuevaProximaDosis;
      medicamento.estado = 'activo';

      // CLAVE: Reprogramar notificaciones para este medicamento específico

      // Actualizar todo inmediatamente
      this.actualizarEstados();
      this.calcularStats();
      this.actualizarProximasDosisDelDia();

      const nombreMedicamento = this.obtenerNombrePrincipal(medicamento);
      alert(
        `✅ ${nombreMedicamento} marcado como tomado. Próxima dosis: ${this.formatearFechaHora(
          nuevaProximaDosis
        )}`
      );

      console.log('✅ Medicamento actualizado y notificaciones reprogramadas');
    } catch (error) {
      console.error('❌ Error al marcar medicamento como tomado:', error);
      alert('Error al actualizar el medicamento. Por favor, intenta de nuevo.');
    }
  }

  posponerNotificacion(medicamentoId: string): void {
    const medicamento = this.medicamentos.find((m) => m.id === medicamentoId);
    if (!medicamento) return;

    console.log(
      `⏭️ Posponiendo notificación para: ${this.obtenerNombrePrincipal(
        medicamento
      )}`
    );

    // Limpiar notificaciones actuales

    // Programar nueva notificación en 5 minutos
    console.log('✅ Notificación pospuesta por 5 minutos');
  }

  // NUEVO: Descartar notificación
  descartarNotificacion(medicamentoId: string): void {
    this.notificacionesActivas = this.notificacionesActivas.filter(
      (n) => n.id !== medicamentoId
    );
  }

  // NUEVO: Verificar si las notificaciones están habilitadas

  cerrarSesion(): void {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('nombreUsuario');
      this.router.navigate(['/login']);
    }
  }

  verificarEstadoMedicamento(medicamento: Medicamento): void {
    console.log('=== VERIFICACIÓN DE ESTADO ===');
    console.log('Medicamento:', this.obtenerNombrePrincipal(medicamento));
    console.log('Estado actual:', medicamento.estado);
    console.log('Próxima dosis:', medicamento.proximaDosis);
    console.log('Es Date válido:', medicamento.proximaDosis instanceof Date);
    console.log('Timestamp:', medicamento.proximaDosis?.getTime());
    console.log('Activo:', medicamento.activo);

    const ahora = new Date();
    const tiempoHasta = medicamento.proximaDosis.getTime() - ahora.getTime();
    const minutosHasta = tiempoHasta / (1000 * 60);
    console.log('Minutos hasta próxima dosis:', Math.round(minutosHasta));
    console.log('===============================');
  }

  formatearFechaHora(timestamp: any): string {
    if (!timestamp) return 'No definida';

    const fecha = this.convertirADate(timestamp);

    return fecha.toLocaleString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  }

  obtenerClasesColor(color: string): string {
    const colores: { [key: string]: string } = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      red: 'bg-red-100 text-red-600',
    };

    return colores[color] || 'bg-gray-100 text-gray-600';
  }

  obtenerClasesEstado(estado: string): string {
    const estados: { [key: string]: string } = {
      activo: 'bg-green-100 text-green-800',
      proximo: 'bg-yellow-100 text-yellow-800',
      vencido: 'bg-red-100 text-red-800',
    };

    return estados[estado] || 'bg-gray-100 text-gray-800';
  }

  obtenerTextoEstado(estado: string): string {
    const textos: { [key: string]: string } = {
      activo: 'Activo',
      proximo: 'Próximo',
      vencido: 'Vencido',
    };

    return textos[estado] || estado;
  }

  contarMedicamentosActivos(): number {
    return this.medicamentos.filter((med) => med.activo === true).length;
  }

  obtenerProximaDosis(): string {
    const info = this.obtenerInfoProximaDosis();
    return info.hora;
  }

  obtenerInfoProximaDosis(): { hora: string; nombre: string } {
    if (this.medicamentos.length === 0) {
      return { hora: 'N/A', nombre: '' };
    }

    const medicamentosActivos = this.medicamentos
      .filter((med) => med.activo && med.proximaDosis)
      .sort((a, b) => {
        const fechaA = this.convertirADate(a.proximaDosis);
        const fechaB = this.convertirADate(b.proximaDosis);
        return fechaA.getTime() - fechaB.getTime();
      });

    if (medicamentosActivos.length === 0) {
      return { hora: 'N/A', nombre: '' };
    }

    const medicamentoProximo = medicamentosActivos[0];
    const proximaDosis = this.convertirADate(medicamentoProximo.proximaDosis);
    const nombreMedicamento = this.obtenerNombrePrincipal(medicamentoProximo);

    this.proximaDosisNombre = nombreMedicamento;
    this.proximaDosisHora = this.formatearFechaHora(proximaDosis);

    return {
      hora: this.formatearFechaHora(proximaDosis),
      nombre: nombreMedicamento,
    };
  }

  contarColoresUnicos(): number {
    const coloresUnicos = new Set(
      this.medicamentos.map((med) => med.color).filter((color) => color)
    );
    return coloresUnicos.size;
  }

  obtenerSaludo(): string {
    const hora = new Date().getHours();

    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  // NUEVO: Método para actualizar el cache de próximas dosis del día
  private actualizarProximasDosisDelDia(): void {
    this.proximasDosisDelDia = this.calcularProximasDosisDelDia();
  }

  // MEJORADO: Método para obtener todas las próximas dosis del día ordenadas
  private calcularProximasDosisDelDia(): Array<{
    medicamento: string;
    hora: Date;
    estado: string;
  }> {
    const ahora = new Date();
    const finDelDia = new Date();
    finDelDia.setHours(23, 59, 59, 999);

    const dosisDelDia: Array<{
      medicamento: string;
      hora: Date;
      estado: string;
    }> = [];

    this.medicamentos.forEach((med) => {
      if (!med.activo) return;

      // CAMBIO CLAVE: Usar la próxima dosis real del medicamento, no calcular desde hora inicio
      const proximaDosisReal = this.convertirADate(med.proximaDosis);
      let dosisHora = new Date(proximaDosisReal);

      // Agregar la próxima dosis real si está dentro del día
      if (dosisHora > ahora && dosisHora <= finDelDia) {
        dosisDelDia.push({
          medicamento: this.obtenerNombrePrincipal(med),
          hora: new Date(dosisHora),
          estado:
            dosisHora.getTime() - ahora.getTime() <= 30 * 60 * 1000
              ? 'proximo'
              : 'pendiente',
        });
      }

      // Calcular las siguientes dosis del día basándose en la frecuencia
      let siguienteDosis = new Date(
        dosisHora.getTime() + med.frecuenciaHoras * 60 * 60 * 1000
      );

      while (siguienteDosis <= finDelDia) {
        if (siguienteDosis > ahora) {
          dosisDelDia.push({
            medicamento: this.obtenerNombrePrincipal(med),
            hora: new Date(siguienteDosis),
            estado:
              siguienteDosis.getTime() - ahora.getTime() <= 30 * 60 * 1000
                ? 'proximo'
                : 'pendiente',
          });
        }

        siguienteDosis = new Date(
          siguienteDosis.getTime() + med.frecuenciaHoras * 60 * 60 * 1000
        );
      }
    });

    // Ordenar por hora y devolver
    return dosisDelDia.sort((a, b) => a.hora.getTime() - b.hora.getTime());
  }

  // PÚBLICO: Método que usa el template para obtener las próximas dosis
  obtenerProximasDosisDelDia(): Array<{
    medicamento: string;
    hora: Date;
    estado: string;
  }> {
    return this.proximasDosisDelDia;
  }

  debugNotificaciones(): void {
    console.log('=== DEBUG DASHBOARD NOTIFICACIONES ===');
    console.log(
      'Medicamentos activos:',
      this.medicamentos.filter((m) => m.activo).length
    );

    this.medicamentos
      .filter((m) => m.activo)
      .forEach((med) => {
        const ahora = new Date();
        const proximaDosis = this.convertirADate(med.proximaDosis);
        const minutosHasta =
          (proximaDosis.getTime() - ahora.getTime()) / (1000 * 60);

        console.log(`📋 ${this.obtenerNombrePrincipal(med)}:`);
        console.log(`   - Estado: ${med.estado}`);
        console.log(`   - Próxima dosis: ${proximaDosis.toLocaleString()}`);
        console.log(`   - Minutos hasta: ${Math.round(minutosHasta)}`);
      });

    // Debug del servicio de notificaciones
    console.log('=====================================');
  }

  debugProximasDosis(): void {
    console.log('=== DEBUG PRÓXIMAS DOSIS ===');
    const proximasDosis = this.obtenerProximasDosisDelDia();
    proximasDosis.slice(0, 5).forEach((dosis, index) => {
      console.log(
        `${index + 1}. ${dosis.medicamento} - ${this.formatearHora(
          dosis.hora
        )} (${dosis.estado})`
      );
    });
    console.log('=== FIN DEBUG ===');
  }
}
