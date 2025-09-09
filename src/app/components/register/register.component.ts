import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { FirestoreAuthService } from 'src/app/services/firestore-auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  imports: [FormsModule],
  standalone: true,
})
export class RegisterComponent {
  constructor(
    private auth: FirestoreAuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  email: string = '';
  password: string = '';
  public loading = false;
public errorMsg = '';


  // onSubmit(registerForm: NgForm) {
  //   if (registerForm.invalid) {
  //     if (registerForm.controls['email']?.invalid) {
  //       this.toastr.error(
  //         'Por favor ingresa un correo válido que contenga "@"'
  //       );
  //     } else if (registerForm.controls['password']?.invalid) {
  //       this.toastr.error('La contraseña debe tener al menos 8 caracteres.');
  //     } else {
  //       this.toastr.error('Por favor completa todos los campos correctamente.');
  //     }
  //     return;
  //   } else if (registerForm.valid) {
  //     this.toastr.success('Formulario válido. Registrando...');
  //     this.auth
  //       .register(this.email, this.password)
  //       .then((user) => {
  //         this.toastr.success('¡Bienvenido!', 'Login Exitoso:' + user.email);
  //         this.router.navigate(['/login']);
  //       })
  //       .catch((error) => {
  //         this.toastr.error('Error al iniciar sesión: ' + error.message);
  //       });
  //   }
  // }

  private mapRegisterError(error: any): string {
  const msg = (error?.message || '').toLowerCase();
  const status = error?.status;

  if (msg.includes('already registered') || msg.includes('exists')) {
    return 'Ya existe una cuenta con este correo.';
  }
  if (msg.includes('invalid email')) {
    return 'El correo ingresado no es válido.';
  }
  if (msg.includes('password') && (msg.includes('short') || msg.includes('length') || msg.includes('weak'))) {
    return 'La contraseña no cumple los requisitos mínimos.';
  }
  if (status === 429 || msg.includes('rate limit')) {
    return 'Demasiados intentos. Probá nuevamente en unos minutos.';
  }
  if (status === 0 || msg.includes('network') || msg.includes('fetch')) {
    return 'Problema de conexión. Verificá tu internet e intentá otra vez.';
  }
  return 'No pudimos completar el registro. Intentá de nuevo.';
}

private toastOk(msg: string) {
  this.toastr.success(msg, '', {
    positionClass: 'toast-center',
    timeOut: 3000,
    progressBar: true
  });
}

private toastError(msg: string) {
  this.toastr.error(msg, 'Error', {
    positionClass: 'toast-center',
    closeButton: true,
    progressBar: true,
    timeOut: 4500
  });
}

private markAllAsTouched(form: NgForm) {
  Object.values(form.controls).forEach(c => c.markAsTouched());
}

onSubmit(registerForm: NgForm) {
  this.errorMsg = '';

  // Evitar doble click
  if (this.loading) return;

  // Validación de formulario
  if (registerForm.invalid) {
    this.markAllAsTouched(registerForm);

    if (registerForm.controls['email']?.invalid) {
      const emailCtrl = registerForm.controls['email'];
      if (emailCtrl?.errors?.['required']) {
        this.toastError('El correo es obligatorio.');
      } else if (emailCtrl?.errors?.['email']) {
        this.toastError('Ingresá un correo válido (ej: usuario@dominio.com).');
      } else {
        this.toastError('Revisá el formato del correo.');
      }
    } else if (registerForm.controls['password']?.invalid) {
      const passCtrl = registerForm.controls['password'];
      if (passCtrl?.errors?.['required']) {
        this.toastError('La contraseña es obligatoria.');
      } else if (passCtrl?.errors?.['minlength']) {
        this.toastError('La contraseña debe tener al menos 8 caracteres.');
      } else {
        this.toastError('Revisá la contraseña.');
      }
    } else {
      this.toastError('Por favor completá todos los campos correctamente.');
    }
    return;
  }

  // Llamada a registro
  this.loading = true;
  this.toastOk('Formulario válido. Registrando...');

  this.auth
    .register(this.email, this.password)
    .then((res: any) => {
      // Algunos backends devuelven user o una verificación por email
      const correo = res?.user?.email || this.email;
      //this.toastOk('¡Cuenta creada! Revisá tu correo si se requiere verificación.');
      // Limpiar estado
      this.email = '';
      this.password = '';
      // Redirigir al login
      this.router.navigate(['/login']);
    })
    .catch((error: any) => {
      const msg = this.mapRegisterError(error);
      this.errorMsg = msg;       // Para mostrar inline en la vista
      this.toastError(msg);      // Y también toast visible
      console.error('Register error:', error);
    })
    .finally(() => {
      this.loading = false;
    });
}
  

    goToLogin() {
    console.log('Navigating to login page');
    this.router.navigate(['/login']);
  }
}
