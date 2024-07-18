import { LOCALE_ID, NgModule, isDevMode } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { AppComponent } from './app.component';
import { AdminComponent } from './pages/admin/admin.component';
import { StatsComponent } from './pages/stats/stats.component';
import { LoginComponent } from './pages/login/login.component';
import { RouterModule, RouterOutlet } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MainComponent } from './components/main/main.component';
import localeDe from '@angular/common/locales/de';
import { ServiceWorkerModule } from '@angular/service-worker';

registerLocaleData(localeDe);

@NgModule({
  declarations: [AppComponent, MainComponent, AdminComponent, StatsComponent, LoginComponent],
  imports: [
    CommonModule,
    BrowserModule,
    RouterModule.forRoot(routes),
    RouterOutlet,
    FormsModule,
    ReactiveFormsModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  bootstrap: [AppComponent],
  providers: [
    provideFirebaseApp(() =>
      initializeApp({
        projectId: 'svvdritte',
        appId: '1:1069458989877:web:9bbe12bb0b7b9b4eada27c',
        storageBucket: 'svvdritte.appspot.com',
        apiKey: 'AIzaSyCo0AcB7oNQMq-nVn5yOKZ4z9ylF-zwlzA',
        authDomain: 'svvdritte.firebaseapp.com',
        messagingSenderId: '1069458989877',
        measurementId: 'G-0FV9W0HT98'
      })
    ),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    {
      provide: LOCALE_ID,
      useValue: 'de-DE'
    }
  ]
})
export class AppModule {}
