import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  email = '';
  password = '';
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onRegister() {
    this.loading = true;
    this.authService
      .register(this.email, this.password)
      .then(() => {
        alert('✅ Registro exitoso');
        this.router.navigate(['/auth/login']);
      })
      .catch((err) => {
        alert('❌ Error: ' + err.message);
      })
      .finally(() => {
        this.loading = false;
      });
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
