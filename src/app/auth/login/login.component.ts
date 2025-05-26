import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    this.loading = true;
    this.authService
      .login(this.email, this.password)
      .then(() => {
        alert('✅ Inicio de sesión exitoso');
        this.email = '';
        this.password = '';

        // Navegar al dashboard después del login exitoso
        this.router.navigate(['/dashboard']);
      })
      .catch((err) => {
        alert('❌ Error: ' + err.message);
      })
      .finally(() => {
        this.loading = false;
      });
  }
}
