/**
 * Server configuration for the web app
 * Contains development server settings and middleware
 */
export const serverConfig = (isDevelopment: boolean = false) => ({
  port: 5173,
  strictPort: true, // Fail if port is already in use instead of trying another port
  hmr: {
    overlay: false,
  },
});

export const previewConfig = {
  port: 4173,
  strictPort: true, // Fail if port is already in use instead of trying another port
};
