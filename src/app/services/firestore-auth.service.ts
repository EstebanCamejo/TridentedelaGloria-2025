import { Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  getAuth,
} from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FirestoreAuthService {
  private currentUserSubject = new BehaviorSubject<string | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private auth: Auth) {
    onAuthStateChanged(getAuth(), (user) => {
      this.currentUserSubject.next(user?.email ?? null);
    });
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password)
      .then((userCredential) => {
        // Signed in
        const user = userCredential.user;
        console.log('User logged in:', user.email);
        return user;
      })
      .catch((error) => {
        console.error('Error logging in:', error);
        throw error;
      });
  }

  register(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password)
      .then((userCredential) => {
        // User registered
        const user = userCredential.user;
        console.log('User registered:', user.email);
        return user;
      })
      .catch((error) => {
        console.error('Error registering:', error);
        throw error;
      });
  }

  logOut() {
    return this.auth.signOut().then(() => {
      console.log('User logged out');
    });
  }

  getUser(): string | null {
    const user = this.auth.currentUser;
    return user?.email ?? null;
  }
}
