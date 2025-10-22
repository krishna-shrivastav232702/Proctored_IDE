export const FRAMEWORK_IMAGES: Record<string, string> = {
    NEXTJS: "your-registry.io/nextjs-ide:v1.0",
    REACT_VITE: "your-registry.io/react-vite-ide:v1.0",
    VUE: "your-registry.io/vue-ide:v1.0",
    ANGULAR: "your-registry.io/angular-ide:v1.0",
    SVELTE: "your-registry.io/svelte-ide:v1.0",
    STATIC_HTML: "your-registry.io/static-html-ide:v1.0"
};

export const FRAMEWORK_BUILD_COMMANDS: Record<string, string> = {
    NEXTJS: "npm run build",
    REACT_VITE: "npm run build",
    VUE: "npm run build",
    ANGULAR: "ng build --configuration production",
    SVELTE: "npm run build",
    STATIC_HTML: "echo 'No build required'"
};

export const FRAMEWORK_DEV_COMMANDS: Record<string, string> = {
    NEXTJS: "npm run dev",
    REACT_VITE: "npm run dev",
    VUE: "npm run dev",
    ANGULAR: "ng serve --host 0.0.0.0 --port 3000",
    SVELTE: "npm run dev -- --host",
    STATIC_HTML: "npx http-server . -p 3000"
};

export const FRAMEWORK_BUILD_OUTPUTS: Record<string, string[]> = {
    NEXTJS: [".next", "out"],
    REACT_VITE: ["dist"],
    VUE: ["dist"],
    ANGULAR: ["dist"],
    SVELTE: ["public/build", "build"],
    STATIC_HTML: ["."]
};

export const FRAMEWORK_DEV_PORTS: Record<string, number> = {
    NEXTJS: 3000,
    REACT_VITE: 5173,
    VUE: 5173,
    ANGULAR: 4200,
    SVELTE: 5173,
    STATIC_HTML: 3000
};

export const getDockerImage = (framework: string): string => {
    return FRAMEWORK_IMAGES[framework] || FRAMEWORK_IMAGES.NEXTJS;
};

export const getBuildCommand = (framework: string): string => {
    return FRAMEWORK_BUILD_COMMANDS[framework] || "npm run build";
};

export const getDevCommand = (framework: string): string => {
    return FRAMEWORK_DEV_COMMANDS[framework] || "npm run dev";
};

export const getBuildOutputDirs = (framework: string): string[] => {
    return FRAMEWORK_BUILD_OUTPUTS[framework] || ["dist"];
};

export const getDevPort = (framework: string): number => {
    return FRAMEWORK_DEV_PORTS[framework] || 3000;
};