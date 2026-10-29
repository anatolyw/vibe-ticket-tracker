import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from './components/app-header/app-header.component';
import { AppSidebarComponent } from './components/app-sidebar/app-sidebar.component';
import { getIsDark, setDark } from './lib/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppHeaderComponent, AppSidebarComponent],
  template: `
    <div class="flex h-screen bg-background overflow-hidden" [class.dark]="isDark()">
      <app-sidebar [isOpen]="mobileSidebarOpen()" (close)="closeMobileSidebar()" />
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header />
        <main class="flex-1 overflow-y-auto p-4 md:p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AppComponent {
  isDark = signal(false);
  mobileSidebarOpen = signal(false);

  constructor() {
    this.isDark.set(getIsDark());
  }

  openMobileSidebar(): void {
    this.mobileSidebarOpen.set(true);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }
}
