export interface FileTemplate {
  name: string;
  path: string;
  content: string;
  language: string;
}

export interface LanguageTemplate {
  name: string;
  displayName: string;
  files: FileTemplate[];
  logo?: React.ComponentType<{ className?: string }>;
}

export const languageTemplates: Record<string, LanguageTemplate> = {
  htmlcssjs: {
    name: "htmlcssjs",
    displayName: "HTML/CSS/JS",
    files: [
      {
        name: "index.html",
        path: "index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Project</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <h1>Hello World!</h1>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
      },
      {
        name: "style.css",
        path: "style.css",
        language: "css",
        content: `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: system-ui, -apple-system, sans-serif;
    background: #f5f5f5;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}

#app {
    text-align: center;
}

h1 {
    color: #333;
    font-size: 2.5rem;
}`,
      },
      {
        name: "script.js",
        path: "script.js",
        language: "javascript",
        content: `console.log('Hello from script.js!');

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    console.log('App element:', app);
});`,
      },
    ],
  },
  nextjs: {
    name: "nextjs",
    displayName: "Next.js",
    files: [
      {
        name: "page.jsx",
        path: "app/page.jsx",
        language: "javascript",
        content: `export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to Next.js
        </h1>
        <p className="text-gray-600">
          Start building your application
        </p>
      </div>
    </main>
  );
}`,
      },
      {
        name: "layout.jsx",
        path: "app/layout.jsx",
        language: "javascript",
        content: `import './globals.css';

export const metadata = {
  title: 'My Next.js App',
  description: 'Built with Next.js',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`,
      },
      {
        name: "globals.css",
        path: "app/globals.css",
        language: "css",
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #f8fafc;
  color: #1a202c;
}`,
      },
      {
        name: "package.json",
        path: "package.json",
        language: "json",
        content: `{
  "name": "my-nextjs-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "13.5.1",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}`,
      },
    ],
  },
  reactjs: {
    name: "reactjs",
    displayName: "React.js",
    files: [
      {
        name: "App.jsx",
        path: "src/App.jsx",
        language: "javascript",
        content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to React</h1>
        <p>Start building your application</p>
      </header>
    </div>
  );
}

export default App;`,
      },
      {
        name: "index.js",
        path: "src/index.js",
        language: "javascript",
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      },
      {
        name: "App.css",
        path: "src/App.css",
        language: "css",
        content: `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 60px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

p {
  font-size: 1.2rem;
}`,
      },
      {
        name: "package.json",
        path: "package.json",
        language: "json",
        content: `{
  "name": "my-react-app",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}`,
      },
    ],
  },
  vuejs: {
    name: "vuejs",
    displayName: "Vue.js",
    files: [
      {
        name: "App.vue",
        path: "src/App.vue",
        language: "html",
        content: `<template>
  <div id="app">
    <header>
      <h1>Welcome to Vue.js</h1>
      <p>{{ message }}</p>
    </header>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      message: 'Start building your application'
    }
  }
}
</script>

<style scoped>
#app {
  font-family: system-ui, -apple-system, sans-serif;
  text-align: center;
  padding: 60px;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}

h1 {
  color: #42b983;
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

p {
  color: #666;
  font-size: 1.2rem;
}
</style>`,
      },
      {
        name: "main.js",
        path: "src/main.js",
        language: "javascript",
        content: `import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');`,
      },
      {
        name: "package.json",
        path: "package.json",
        language: "json",
        content: `{
  "name": "my-vue-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.3.4"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.3.4",
    "vite": "^4.4.9"
  }
}`,
      },
    ],
  },
  angular: {
    name: "angular",
    displayName: "Angular",
    files: [
      {
        name: "app.component.ts",
        path: "src/app/app.component.ts",
        language: "typescript",
        content: `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'my-angular-app';
  message = 'Start building your application';
}`,
      },
      {
        name: "app.component.html",
        path: "src/app/app.component.html",
        language: "html",
        content: `<div class="container">
  <header>
    <h1>Welcome to {{ title }}</h1>
    <p>{{ message }}</p>
  </header>
</div>`,
      },
      {
        name: "app.component.css",
        path: "src/app/app.component.css",
        language: "css",
        content: `.container {
  font-family: system-ui, -apple-system, sans-serif;
  text-align: center;
  padding: 60px;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}

h1 {
  color: #dd0031;
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

p {
  color: #666;
  font-size: 1.2rem;
}`,
      },
      {
        name: "main.ts",
        path: "src/main.ts",
        language: "typescript",
        content: `import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));`,
      },
      {
        name: "package.json",
        path: "package.json",
        language: "json",
        content: `{
  "name": "my-angular-app",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "test": "ng test"
  },
  "private": true,
  "dependencies": {
    "@angular/animations": "^16.2.0",
    "@angular/common": "^16.2.0",
    "@angular/compiler": "^16.2.0",
    "@angular/core": "^16.2.0",
    "@angular/platform-browser": "^16.2.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0"
  }
}`,
      },
    ],
  },
  python: {
    name: "python",
    displayName: "Python",
    files: [
      {
        name: "main.py",
        path: "main.py",
        language: "python",
        content: `def main():
    """Main function"""
    print("Hello, World!")

    # Your code here


if __name__ == "__main__":
    main()`,
      },
      {
        name: "requirements.txt",
        path: "requirements.txt",
        language: "plaintext",
        content: `# Add your Python dependencies here
# Example:
# requests==2.31.0
# flask==2.3.0`,
      },
    ],
  },
};
