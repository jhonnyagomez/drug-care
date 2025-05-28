import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
} from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private authStateChecked = false;

  constructor(private auth: Auth, private router: Router) {
    this.initAuthStateListener();
  }

  private initAuthStateListener(): void {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
      this.authStateChecked = true;
    });
  }

  // Observables
  get currentUser$(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  get isAuthenticated$(): Observable<boolean> {
    return this.currentUser$.pipe(map((user) => !!user));
  }

  // Getters sincrónicos
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  get isAuthStateChecked(): boolean {
    return this.authStateChecked;
  }

  getUid(): string | null {
    return this.currentUser?.uid ?? null;
  }

  getUserEmail(): string | null {
    return this.currentUser?.email ?? null;
  }

  getUserDisplayName(): string | null {
    return this.currentUser?.displayName ?? null;
  }

  isEmailVerified(): boolean {
    return this.currentUser?.emailVerified ?? false;
  }

  register(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  async login(email: string, password: string): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      return userCredential;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.router.navigate(['/auth/login']);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async sendVerificationEmail(): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No hay usuario autenticado');
    }

    try {
      await sendEmailVerification(this.currentUser);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async updateUserProfile(
    displayName?: string,
    photoURL?: string
  ): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No hay usuario autenticado');
    }

    try {
      await updateProfile(this.currentUser, {
        displayName: displayName ?? this.currentUser.displayName,
        photoURL: photoURL ?? this.currentUser.photoURL,
      });
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Método para esperar a que se complete la verificación del estado de auth
  waitForAuthState(): Promise<User | null> {
    return new Promise((resolve) => {
      if (this.authStateChecked) {
        resolve(this.currentUser);
      } else {
        const subscription = this.currentUser$.subscribe((user) => {
          if (this.authStateChecked) {
            subscription.unsubscribe();
            resolve(user);
          }
        });
      }
    });
  }

  // Manejo de errores mejorado
  private handleAuthError(error: any): Error {
    let message = 'Error desconocido';

    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Ya existe una cuenta con este correo electrónico';
        break;
      case 'auth/weak-password':
        message = 'La contraseña debe tener al menos 6 caracteres';
        break;
      case 'auth/user-not-found':
        message = 'No existe una cuenta con este correo electrónico';
        break;
      case 'auth/wrong-password':
        message = 'Contraseña incorrecta';
        break;
      case 'auth/invalid-email':
        message = 'Correo electrónico inválido';
        break;
      case 'auth/user-disabled':
        message = 'Esta cuenta ha sido deshabilitada';
        break;
      case 'auth/too-many-requests':
        message = 'Demasiados intentos fallidos. Intenta más tarde';
        break;
      case 'auth/network-request-failed':
        message = 'Error de conexión. Verifica tu conexión a internet';
        break;
      case 'auth/requires-recent-login':
        message =
          'Esta operación requiere que hayas iniciado sesión recientemente';
        break;
      default:
        message = error.message || 'Error en la autenticación';
    }

    return new Error(message);
  }
}
